import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabase } from "@/lib/supabase";
import {
  createOrUpdatePatient,
  getPatientByPhone,
  isOnboardingTranscript,
  parseOnboardingCallTranscript,
} from "@/lib/patient";
import { analyzeCallTranscript } from "@/lib/analyzeCallTranscript";
import type { BolnaWebhookPayload } from "@/lib/types";

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

function hospitalShortName(name: string): string {
  return name.split(",")[0]?.trim() || name;
}

function buildTransportSms(hospitalName: string, shortUrl: string): string {
  const hospitalShort = hospitalShortName(hospitalName);
  return `Hospital: ${hospitalShort}. Uber: ${shortUrl}`.slice(0, 160);
}

function buildAlertSms(patientName: string): string {
  return `Setu: ${patientName} ne dawai nahi li. Unhe call karein.`.slice(
    0,
    160,
  );
}

function buildUberDeepLink(place: {
  name: string;
  lat: string;
  lon: string;
}): string {
  return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${place.lat}&dropoff[longitude]=${place.lon}&dropoff[nickname]=${encodeURIComponent(place.name.split(",")[0])}`;
}

async function fetchNearbyHospital(
  origin: string,
  patientPhone: string,
): Promise<{
  nearbyResult: unknown;
  hospital: { name: string; address: string; lat: string; lon: string } | null;
}> {
  try {
    const response = await fetch(`${origin}/api/tools/nearby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "hospital",
        patient_phone: patientPhone,
      }),
    });

    const nearbyResult = await response.json();

    if (!response.ok) {
      console.error("Nearby hospitals request failed:", response.status);
      return { nearbyResult, hospital: null };
    }

    const first = (
      nearbyResult as {
        places?: Array<{
          name?: string;
          address?: string;
          lat?: string;
          lon?: string;
        }>;
      }
    ).places?.[0];

    if (!first?.name || !first.lat || !first.lon) {
      return { nearbyResult, hospital: null };
    }

    return {
      nearbyResult,
      hospital: {
        name: first.name,
        address: first.address ?? "",
        lat: first.lat,
        lon: first.lon,
      },
    };
  } catch (error) {
    console.error("Failed to fetch nearby hospitals:", error);
    return { nearbyResult: null, hospital: null };
  }
}

export async function POST(request: NextRequest) {
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
  let familySmsTo = process.env.FAMILY_PHONE_NUMBER!;
  let caller_phone: string | null =
    body.from ??
    body.caller_id ??
    body.metadata?.from ??
    body.to ??
    body.recipient ??
    body.phone_number ??
    body.metadata?.phone ??
    null;

  if (isOnboardingTranscript(transcript)) {
    console.log("ONBOARDING CALL DETECTED");

    const parsedData = parseOnboardingCallTranscript(transcript);
    console.log("PARSED DATA:", parsedData);

    const phoneKey =
      parsedData.family_phone ?? `onboarding_${Date.now()}`;

    const result = await createOrUpdatePatient(phoneKey, {
      name: parsedData.name,
      medications: parsedData.medications,
      reminder_time: parsedData.reminder_time,
      family_phone:
        parsedData.family_phone ?? process.env.FAMILY_PHONE_NUMBER,
      onboarded: true,
    });
    console.log("PATIENT SAVED:", result);

    if (result) {
      patient = result;
      caller_phone = phoneKey;
      if (result.name) {
        patient_name = result.name;
      } else if (parsedData.name) {
        patient_name = parsedData.name;
      }
      familySmsTo = result.family_phone ?? familySmsTo;
    } else if (parsedData.name) {
      patient_name = parsedData.name;
    }
  } else {
    caller_phone =
      caller_phone ?? `temp_${body.call_id || Date.now()}`;

    console.log("CALLER PHONE:", caller_phone);

    const existingPatient = await getPatientByPhone(caller_phone);
    console.log("EXISTING PATIENT:", existingPatient);

    patient = existingPatient;

    if (!patient || !patient.onboarded) {
      const parsedData = parseOnboardingCallTranscript(transcript);
      console.log("PARSED DATA:", parsedData);

      const upsertResult = await createOrUpdatePatient(caller_phone, {
        ...parsedData,
        family_phone:
          parsedData.family_phone ?? process.env.FAMILY_PHONE_NUMBER,
        onboarded: true,
      });
      console.log("UPSERT RESULT:", upsertResult);

      if (upsertResult) {
        patient = upsertResult;
        if (upsertResult.name) {
          patient_name = upsertResult.name;
        } else if (parsedData.name) {
          patient_name = parsedData.name;
        }
        familySmsTo = upsertResult.family_phone ?? familySmsTo;
      } else if (parsedData.name) {
        patient_name = parsedData.name;
      }
    } else {
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
  });

  if (insertError) {
    console.error("Failed to insert call_logs row:", insertError);
  }

  const needsAlert =
    status === "no-answer" ||
    action_required === "yes" ||
    medication_taken === "no";

  const needsTransport = !!(
    transcript &&
    /doctor|hospital|jaana hai|jaana tha|le chalo|ले जाओ|जाना है|doctor ke paas/i.test(
      transcript,
    )
  );
  console.log(
    "NEEDS TRANSPORT:",
    needsTransport,
    "TRANSCRIPT SNIPPET:",
    transcript?.substring(0, 100),
  );

  if (needsAlert || needsTransport) {
    const patientName = patient_name !== "Unknown" ? patient_name : "Unhe";

    if (needsAlert) {
      const alertBody = buildAlertSms(patientName);
      console.log("SMS BODY:", alertBody);
      try {
        await twilioClient.messages.create({
          body: alertBody,
          from: process.env.TWILIO_FROM_NUMBER!,
          to: familySmsTo,
        });
        console.log("SMS alert sent to family");
      } catch (error) {
        console.error("Failed to send SMS alert:", error);
      }
    }

    if (needsTransport) {
      const patientPhone = patient?.phone ?? caller_phone;
      if (patientPhone) {
        console.log("CALLING NEARBY API...");
        const { nearbyResult, hospital } = await fetchNearbyHospital(
          request.nextUrl.origin,
          patientPhone,
        );
        console.log("NEARBY RESULT:", JSON.stringify(nearbyResult));
        if (hospital) {
          const uberLink = buildUberDeepLink(hospital);
          const shortUrl = await fetch(
            `https://tinyurl.com/api-create.php?url=${encodeURIComponent(uberLink)}`,
          )
            .then((r) => r.text())
            .catch(() => uberLink);
          const transportBody = buildTransportSms(hospital.name, shortUrl);
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
    }
  }

  return NextResponse.json({ received: true });
}
