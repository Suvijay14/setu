// Variables available in Bolna: patient_name, medications, last_call_notes, call_streak

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabase } from "@/lib/supabase";
import {
  buildGroqOnboardingUpsert,
  createOrUpdatePatient,
  getPatientByPhone,
} from "@/lib/patient";
import {
  analyzeCallTranscript,
  getEmergencyConcernForSms,
} from "@/lib/analyzeCallTranscript";
import {
  extractCallSummary,
  extractRefillIntent,
} from "@/lib/extractCallSummary";
import { getAppBaseUrl } from "@/lib/escalationSms";
import { searchNearby, type NearbyPlace } from "@/lib/nearbySearch";
import type {
  BolnaWebhookPayload,
  GroqOnboardingExtract,
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

function buildNoAnswerSms(patientName: string): string {
  return truncateSms(`⚠️ Setu Alert
${patientName}
Call nahi uthaya.
Unhe check karein.`);
}

function buildMedicationNotTakenSms(patientName: string): string {
  return truncateSms(`⚠️ Setu Alert
${patientName}
Dawai nahi li aaj.
Unhe call karein.`);
}

function buildEmergencySms(patientName: string, concern: string): string {
  return truncateSms(`🚨 Setu Emergency
${patientName}
${concern.slice(0, 80)}
ABHI call karein.`);
}

function buildRefillPharmacySms(
  patientName: string,
  patientPhone: string,
  medicine: string,
): string {
  return truncateSms(`💊 Setu Refill
Patient: ${patientName}
Phone: ${patientPhone}
Medicine: ${medicine.slice(0, 60)}
Refill requested on voice call.`);
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

type LocationExtract = {
  query: string;
  location: string | null;
};

async function extractLocationQuery(
  transcript: string,
): Promise<LocationExtract | null> {
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

Does the parent want to find or go somewhere nearby?

Return ONLY valid JSON (or null if no location search is needed):
{
  "query": "simple English search term e.g. hospital, pharmacy, bank, doctor",
  "current_location": "where they are right now if mentioned, e.g. Connaught Place Delhi, otherwise null"
}

current_location: if the patient mentions where they currently are (e.g. 'main abhi Connaught Place mein hoon'), extract that. Otherwise null.

If no location search is needed, respond with null.`,
            },
          ],
          max_tokens: 80,
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
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content.toLowerCase() === "null") return null;

    const jsonText = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(jsonText) as {
        query?: string | null;
        current_location?: string | null;
      };
      const query = parsed.query?.trim();
      if (!query) return null;

      const currentLocation = parsed.current_location?.trim() || null;
      return { query, location: currentLocation };
    } catch {
      if (jsonText.toLowerCase() === "null") return null;
      return { query: jsonText, location: null };
    }
  } catch (error) {
    console.error("extractLocationQuery error:", error);
    return null;
  }
}

async function extractMemoryNotes(
  transcript: string,
  concern: string | null,
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
              content: `From this Hindi call transcript, extract what Setu should remember for the NEXT call.

Transcript: ${transcript}
${concern ? `Known concern from this call: ${concern}` : ""}

Extract in this format (one line each, skip if not mentioned):
- Pain or health issue: [what they mentioned]
- Mood: [how they seemed]
- Family news: [anything about family]
- Request: [anything they asked for or wanted]
- Other: [anything else worth remembering]

Return ONLY the relevant lines. If nothing notable, return null.
Keep it under 100 words total.`,
            },
          ],
          max_tokens: 150,
        }),
      },
    );

    if (!response.ok) {
      console.error("Groq memory notes extract failed:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content.toLowerCase() === "null") return null;
    return content;
  } catch (error) {
    console.error("extractMemoryNotes error:", error);
    return null;
  }
}

async function lookupNearbyForPatient(
  patientPhone: string,
  searchQuery: string,
  currentLocationFromTranscript: string | null,
): Promise<{
  places: NearbyPlace[];
  hospital: { name: string; address: string; lat: string; lon: string } | null;
  searchOrigin: string | null;
}> {
  try {
    const patientRecord = await getPatientByPhone(patientPhone);
    const searchOrigin =
      currentLocationFromTranscript?.trim() ||
      patientRecord?.location?.trim() ||
      null;

    if (!searchOrigin) {
      return { places: [], hospital: null, searchOrigin: null };
    }

    console.log(
      "NEARBY SEARCH ORIGIN:",
      searchOrigin,
      currentLocationFromTranscript ? "(from transcript)" : "(from patient record)",
    );

    const places = await searchNearby(searchQuery, searchOrigin);
    const first = places[0];

    if (!first?.name || !first.lat || !first.lon) {
      return { places, hospital: null, searchOrigin };
    }

    return {
      places,
      hospital: {
        name: first.name,
        address: first.address ?? "",
        lat: first.lat,
        lon: first.lon,
      },
      searchOrigin,
    };
  } catch (error) {
    console.error("Failed to lookup nearby places:", error);
    return { places: [], hospital: null, searchOrigin: null };
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
    const medicationsHint = existingPatientEarly?.medications ?? null;

    const [onboardingData, locationExtract, callSummary, memoryNotes, refillIntent] =
      await Promise.all([
        shouldRunOnboardingGroq && groqEnabled
          ? extractOnboardingData(transcript)
          : Promise.resolve(null),
        groqEnabled
          ? extractLocationQuery(transcript)
          : Promise.resolve(null),
        groqEnabled
          ? extractCallSummary(transcript, medication_taken, action_required)
          : Promise.resolve(null),
        groqEnabled
          ? extractMemoryNotes(transcript, patient_concern)
          : Promise.resolve(null),
        groqEnabled
          ? extractRefillIntent(transcript, medicationsHint)
          : Promise.resolve(null),
      ]);

    const refill_needed = refillIntent?.refill_needed === true;
    const refill_medicine = refill_needed
      ? (refillIntent?.medicine ?? null)
      : null;

    const locationQuery = locationExtract?.query ?? null;
    const currentLocationFromTranscript = locationExtract?.location ?? null;

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

    const org_id = patient?.org_id ?? null;

    const emergencyConcern = getEmergencyConcernForSms(transcript);
    const escalationDetected =
      callSummary?.emergency === true || Boolean(emergencyConcern);
    const escalation_reason =
      emergencyConcern ||
      patient_concern ||
      callSummary?.summary ||
      "Distress reported on call";

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
      escalation_flag: escalationDetected,
      sms_sent: callSummary?.sms_sent ?? false,
      org_id,
      refill_needed,
      refill_medicine,
    });

    if (insertError) {
      console.error("Failed to insert call_logs row:", insertError);
    }

    const patientPhoneKey = patient?.phone ?? caller_phone;
    if (
      patientPhoneKey &&
      !patientPhoneKey.startsWith("temp_") &&
      !patientPhoneKey.startsWith("onboarding_")
    ) {
      const previousStreak = patient?.call_streak ?? 0;
      let call_streak = previousStreak;
      if (medication_taken === "yes") {
        call_streak = previousStreak + 1;
      } else if (medication_taken === "no") {
        call_streak = 0;
      }

      const memoryUpdate: {
        last_call_notes?: string;
        call_streak?: number;
      } = {};

      if (memoryNotes) {
        memoryUpdate.last_call_notes = memoryNotes;
      }
      if (medication_taken === "yes" || medication_taken === "no") {
        memoryUpdate.call_streak = call_streak;
      }

      if (Object.keys(memoryUpdate).length > 0) {
        const updatedPatient = await createOrUpdatePatient(
          patientPhoneKey,
          memoryUpdate,
        );
        if (updatedPatient) {
          patient = updatedPatient;
        }
        console.log("PATIENT MEMORY UPDATED:", {
          phone: patientPhoneKey,
          ...memoryUpdate,
        });
      }
    }

    if (
      escalationDetected &&
      org_id &&
      patient?.id &&
      typeof patient.id === "string"
    ) {
      const escalateUrl = `${getAppBaseUrl()}/api/escalate/sms`;
      void fetch(escalateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patient.id,
          org_id,
          escalation_reason,
          call_transcript: transcript,
          patient_name,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errBody = await res.text();
            console.error("escalate/sms failed:", res.status, errBody);
          } else {
            console.log("Clinic escalation SMS requested via /api/escalate/sms");
          }
        })
        .catch((err) => {
          console.error("escalate/sms request error:", err);
        });
    }

    const needsTransport = !!locationQuery;

    console.log(
      "SMS PRIORITY CHECK:",
      {
        status,
        medication_taken,
        emergencyConcern,
        needsTransport,
        locationQuery,
        currentLocationFromTranscript,
      },
      "TRANSCRIPT SNIPPET:",
      transcript?.substring(0, 100),
    );

    const canSendSms =
      hasTwilioCredentials() && hasFamilyPhoneNumber(familySmsTo);

    if (canSendSms) {
      const patientName = patient_name !== "Unknown" ? patient_name : "Unhe";
      const patientPhone = patient?.phone ?? caller_phone;

      const sendSingleSms = async (body: string) => {
        console.log("SMS BODY:", body);
        await twilioClient.messages.create({
          body,
          from: process.env.TWILIO_FROM_NUMBER!,
          to: familySmsTo,
        });
        console.log("SMS sent to family");
      };

      try {
        if (status === "no-answer") {
          await sendSingleSms(buildNoAnswerSms(patientName));
        } else if (medication_taken === "no") {
          await sendSingleSms(buildMedicationNotTakenSms(patientName));
        } else if (emergencyConcern) {
          await sendSingleSms(
            buildEmergencySms(patientName, emergencyConcern),
          );
        } else if (needsTransport && locationQuery && patientPhone) {
          console.log("CALLING NEARBY SEARCH...");
          const { places, hospital, searchOrigin } =
            await lookupNearbyForPatient(
              patientPhone,
              locationQuery,
              currentLocationFromTranscript,
            );
          console.log(
            "NEARBY RESULT:",
            JSON.stringify({ searchOrigin, places }),
          );
          if (hospital) {
            await sendSingleSms(
              buildTransportSms(patientName, locationQuery, hospital.name),
            );
          }
        }
      } catch (error) {
        console.error("Failed to send SMS:", error);
      }
    }

    if (
      refill_needed &&
      org_id &&
      hasTwilioCredentials() &&
      patient?.phone &&
      !patient.phone.startsWith("temp_")
    ) {
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("pharmacy_phone")
        .eq("id", org_id)
        .maybeSingle();

      const pharmacyPhone =
        typeof orgRow?.pharmacy_phone === "string"
          ? orgRow.pharmacy_phone.trim()
          : "";

      if (pharmacyPhone) {
        const medicineLabel = refill_medicine ?? "Medicine";
        try {
          await twilioClient.messages.create({
            body: buildRefillPharmacySms(
              patient_name,
              patient.phone,
              medicineLabel,
            ),
            from: process.env.TWILIO_FROM_NUMBER!,
            to: pharmacyPhone,
          });
          console.log("Refill SMS sent to pharmacy:", pharmacyPhone);
        } catch (error) {
          console.error("Failed to send refill SMS to pharmacy:", error);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ received: true });
  }
}
