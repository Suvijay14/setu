import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabase } from "@/lib/supabase";
import {
  buildGroqOnboardingUpsert,
  createOrUpdatePatient,
  getPatientByPhone,
} from "@/lib/patient";
import { analyzeCallTranscript } from "@/lib/analyzeCallTranscript";
import { searchNearby, type NearbyPlace } from "@/lib/nearbySearch";
import type {
  BolnaWebhookPayload,
  GroqOnboardingExtract,
  MedicationTaken,
  YesNo,
} from "@/lib/types";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

type WebhookBody = BolnaWebhookPayload & {
  from?: string;
  caller_id?: string;
  to?: string;
  recipient?: string;
  phone_number?: string;
  metadata?: { from?: string; phone?: string };
};

function truncateSms(text: string, max = 160): string {
  return text.slice(0, max);
}

function getIstTimeLabel(): string {
  return new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTransportSms(
  patientName: string,
  locationQuery: string,
  placeName: string,
): string {
  const hospitalShortName = placeName.split(",")[0].trim();
  const hospitalArea = placeName.split(",")[1]?.trim() || "";
  const transportSms = `📍 Setu
${patientName} ko bahar jaana hai.
Nazdik ${locationQuery}: ${hospitalShortName}
${hospitalArea}`;
  return truncateSms(transportSms);
}

function buildAlertSms(
  patientName: string,
  status: string | undefined,
  medication_taken: MedicationTaken,
  action_required: YesNo,
  patient_concern: string | null,
): string {
  const time = getIstTimeLabel();

  if (status === "no-answer") {
    return truncateSms(`⚠️ Setu Alert
${patientName}
Call nahi uthaya.
Time: ${time}
Unhe check karein.`);
  }

  if (action_required === "yes") {
    const concernText = patient_concern?.trim() || "Health concern reported.";
    const concern = concernText.slice(0, 60);
    return truncateSms(`🚨 Setu Emergency
${patientName}
"${concern}"
ABHI call karein.`);
  }

  if (medication_taken === "no") {
    return truncateSms(`⚠️ Setu Alert
${patientName}
Dawai nahi li aaj.
Time: ${time}
Unhe call karein.`);
  }

  return truncateSms(`⚠️ Setu Alert
${patientName}
Dawai nahi li aaj.
Time: ${time}
Unhe call karein.`);
}

function hasGroqApiKey(): boolean {
  if (!process.env.GROQ_API_KEY) {
    console.warn("Missing GROQ_API_KEY — skipping Groq extraction");
    return false;
  }
  return true;
}

function hasTwilioCredentials(): boolean {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn(
      "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN — skipping SMS",
    );
    return false;
  }
  return true;
}

function hasFamilyPhoneNumber(to: string): boolean {
  if (!to) {
    console.warn("Missing FAMILY_PHONE_NUMBER — skipping SMS");
    return false;
  }
  return true;
}

async function extractOnboardingData(
  transcript: string,
): Promise<GroqOnboardingExtract | null> {
  if (!transcript) return null;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            {
              role: "user",
              content: `Extract onboarding information from this Hindi conversation transcript.

Transcript:
${transcript}

Extract these fields:
- name: the patient's name (just the name, nothing else)
- medications: what medicines they take (comma separated)
- reminder_time: what time they take medicine, converted to 24hr HH:MM format
- family_phone: 10-digit Indian phone number mentioned, formatted as +91XXXXXXXXXX
- location: their area/city (e.g. "Lajpat Nagar Delhi")

Return ONLY valid JSON like this:
{"name": "Dadi", "medications": "BP tablet, Metformin", "reminder_time": "21:00", "family_phone": "+919910036896", "location": "Lajpat Nagar Delhi"}

If a field is not mentioned, use null for that field.
Return null if this is not an onboarding conversation.`,
            },
          ],
          max_tokens: 150,
        }),
      },
    );

    if (!response.ok) {
      console.error("Groq onboarding extract failed:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content === "null") return null;

    const jsonText = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(jsonText) as GroqOnboardingExtract;
    } catch {
      return null;
    }
  } catch (error) {
    console.error("extractOnboardingData error:", error);
    return null;
  }
}

async function extractLocationQuery(
  transcript: string,
): Promise<string | null> {
  if (!transcript) return null;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            {
              role: "user",
              content: `This is a transcript of an elderly Indian parent talking to a voice assistant in Hindi.

Transcript: ${transcript}

Does the parent want to find or go somewhere nearby? If yes, extract what they are looking for as a simple English search term (e.g. "hospital", "pharmacy", "bank", "doctor", "police station").
If no location search is needed, respond with null.
Respond with ONLY the search term or null. Nothing else.`,
            },
          ],
          max_tokens: 20,
        }),
      },
    );

    if (!response.ok) {
      console.error("Groq location extract failed:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const result = data.choices?.[0]?.message?.content?.trim();
    if (!result || result.toLowerCase() === "null") return null;
    return result;
  } catch (error) {
    console.error("extractLocationQuery error:", error);
    return null;
  }
}

async function extractCallSummary(
  transcript: string,
  medicationTaken: string | null,
  actionRequired: string | null,
): Promise<{
  mood: string | null;
  summary: string | null;
  emergency: boolean;
  sms_sent: boolean;
} | null> {
  if (!transcript) return null;
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            {
              role: "user",
              content: `Analyze this Hindi voice call transcript between an elderly parent and Setu AI.

Transcript:
${transcript}

Return ONLY valid JSON:
{
  "mood": "happy/neutral/sad/anxious/confused",
  "summary": "one line in English describing what happened in the call",
  "emergency": true/false,
  "sms_sent": ${actionRequired === "yes" ? "true" : "false"}
}

mood: detect from patient's tone and words.
summary: brief factual summary like "Ramesh confirmed taking BP tablet at 9pm."
emergency: true only if patient mentioned chest pain, fall, breathing issue.`,
            },
          ],
          max_tokens: 100,
        }),
      },
    );

    if (!response.ok) {
      console.error("Groq call summary extract failed:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const jsonText = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(jsonText) as {
        mood: string | null;
        summary: string | null;
        emergency: boolean;
        sms_sent: boolean;
      };
    } catch {
      return null;
    }
  } catch (error) {
    console.error("extractCallSummary error:", error);
    return null;
  }
}

async function lookupNearbyForPatient(
  patientPhone: string,
  searchQuery: string,
): Promise<{
  places: NearbyPlace[];
  hospital: { name: string; address: string; lat: string; lon: string } | null;
}> {
  try {
    const patientRecord = await getPatientByPhone(patientPhone);
    const location = patientRecord?.location?.trim();
    if (!location) {
      return { places: [], hospital: null };
    }

    const places = await searchNearby(searchQuery, location);
    const first = places[0];

    if (!first?.name || !first.lat || !first.lon) {
      return { places, hospital: null };
    }

    return {
      places,
      hospital: {
        name: first.name,
        address: first.address ?? "",
        lat: first.lat,
        lon: first.lon,
      },
    };
  } catch (error) {
    console.error("Failed to lookup nearby places:", error);
    return { places: [], hospital: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebhookBody;

    console.log("FULL WEBHOOK BODY:", JSON.stringify(body, null, 2));

    const call_id = body.call_id;
    const status = body.status;
    const transcript = body.transcript ?? "";
    const duration = body.duration;
    const { medication_taken, action_required, patient_concern } =
      analyzeCallTranscript(transcript);
    const extractedRecord = body.extracted_data as
      | Record<string, unknown>
      | undefined;

    let patient = null as Awaited<ReturnType<typeof getPatientByPhone>>;
    let patient_name =
      typeof extractedRecord?.patient_name === "string"
        ? extractedRecord.patient_name
        : "Unknown";
    let familySmsTo = process.env.FAMILY_PHONE_NUMBER ?? "";
    let caller_phone: string | null =
      body.from ??
      body.caller_id ??
      body.metadata?.from ??
      body.to ??
      body.recipient ??
      body.phone_number ??
      body.metadata?.phone ??
      null;

    const existingPatientEarly = caller_phone
      ? await getPatientByPhone(caller_phone)
      : null;
    const shouldRunOnboardingGroq = !existingPatientEarly?.onboarded;
    const groqEnabled = hasGroqApiKey();

    const [onboardingData, locationQuery, callSummary] = await Promise.all([
      shouldRunOnboardingGroq && groqEnabled
        ? extractOnboardingData(transcript)
        : Promise.resolve(null),
      groqEnabled
        ? extractLocationQuery(transcript)
        : Promise.resolve(null),
      groqEnabled
        ? extractCallSummary(transcript, medication_taken, action_required)
        : Promise.resolve(null),
    ]);

    console.log("ONBOARDING DATA:", onboardingData);

    if (onboardingData) {
      console.log("ONBOARDING CALL DETECTED");

      const phoneKey =
        caller_phone ??
        onboardingData.family_phone ??
        `onboarding_${Date.now()}`;

      const result = await createOrUpdatePatient(
        phoneKey,
        buildGroqOnboardingUpsert(onboardingData),
      );
      console.log("PATIENT SAVED:", result);

      if (result) {
        patient = result;
        caller_phone = phoneKey;
        if (result.name) {
          patient_name = result.name;
        } else if (onboardingData.name) {
          patient_name = onboardingData.name;
        }
        familySmsTo = result.family_phone ?? familySmsTo;
      } else if (onboardingData.name) {
        patient_name = onboardingData.name;
      }
    } else {
      caller_phone =
        caller_phone ?? `temp_${body.call_id || Date.now()}`;

      console.log("CALLER PHONE:", caller_phone);

      const existingPatient = await getPatientByPhone(caller_phone);
      console.log("EXISTING PATIENT:", existingPatient);

      patient = existingPatient;

      if (patient?.onboarded) {
        patient_name = patient.name ?? patient_name;
        familySmsTo = patient.family_phone ?? familySmsTo;
      }
    }

    console.log("Parsed webhook fields:", {
      call_id,
      status,
      transcript,
      duration,
      medication_taken,
      action_required,
      patient_concern,
      patient_name,
      caller_phone,
    });

    const { error: insertError } = await supabase.from("call_logs").insert({
      call_id,
      patient_name,
      status,
      medication_taken,
      action_required,
      concern: patient_concern,
      transcript,
      duration,
      mood: callSummary?.mood ?? null,
      summary: callSummary?.summary ?? null,
      emergency: callSummary?.emergency ?? false,
      sms_sent: callSummary?.sms_sent ?? false,
    });

    if (insertError) {
      console.error("Failed to insert call_logs row:", insertError);
    }

    const needsAlert =
      status === "no-answer" ||
      action_required === "yes" ||
      medication_taken === "no";

    const needsTransport = !!locationQuery;

    console.log(
      "NEEDS TRANSPORT:",
      needsTransport,
      "LOCATION QUERY:",
      locationQuery,
      "TRANSCRIPT SNIPPET:",
      transcript?.substring(0, 100),
    );

    const canSendSms =
      hasTwilioCredentials() && hasFamilyPhoneNumber(familySmsTo);

    if ((needsAlert || needsTransport) && canSendSms) {
      const patientName = patient_name !== "Unknown" ? patient_name : "Unhe";
      const patientPhone = patient?.phone ?? caller_phone;

      const sendAlertSms = async () => {
        const alertBody = buildAlertSms(
          patientName,
          status,
          medication_taken,
          action_required,
          patient_concern,
        );
        console.log("SMS BODY:", alertBody);
        await twilioClient.messages.create({
          body: alertBody,
          from: process.env.TWILIO_FROM_NUMBER!,
          to: familySmsTo,
        });
        console.log("SMS alert sent to family");
      };

      const runNearbyLookup = async () => {
        console.log("CALLING NEARBY SEARCH...");
        return lookupNearbyForPatient(patientPhone!, locationQuery!);
      };

      if (
        needsAlert &&
        needsTransport &&
        locationQuery &&
        patientPhone
      ) {
        const [alertResult, nearbyResult] = await Promise.allSettled([
          sendAlertSms(),
          runNearbyLookup(),
        ]);

        if (alertResult.status === "rejected") {
          console.error("Failed to send SMS alert:", alertResult.reason);
        }

        if (nearbyResult.status === "rejected") {
          console.error("Nearby lookup failed:", nearbyResult.reason);
        } else {
          console.log(
            "NEARBY RESULT:",
            JSON.stringify({ places: nearbyResult.value.places }),
          );
          const hospital = nearbyResult.value.hospital;
          if (hospital) {
            const transportBody = buildTransportSms(
              patientName,
              locationQuery,
              hospital.name,
            );
            console.log("SMS BODY:", transportBody);
            try {
              await twilioClient.messages.create({
                body: transportBody,
                from: process.env.TWILIO_FROM_NUMBER!,
                to: familySmsTo,
              });
              console.log("SMS alert sent to family");
            } catch (error) {
              console.error("Failed to send SMS alert:", error);
            }
          }
        }
      } else if (needsAlert) {
        try {
          await sendAlertSms();
        } catch (error) {
          console.error("Failed to send SMS alert:", error);
        }
      } else if (needsTransport && locationQuery && patientPhone) {
        try {
          const { places, hospital } = await runNearbyLookup();
          console.log("NEARBY RESULT:", JSON.stringify({ places }));
          if (hospital) {
            const transportBody = buildTransportSms(
              patientName,
              locationQuery,
              hospital.name,
            );
            console.log("SMS BODY:", transportBody);
            await twilioClient.messages.create({
              body: transportBody,
              from: process.env.TWILIO_FROM_NUMBER!,
              to: familySmsTo,
            });
            console.log("SMS alert sent to family");
          }
        } catch (error) {
          console.error("Failed to send transport SMS:", error);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ received: true });
  }
}
