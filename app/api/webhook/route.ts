import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabase } from "@/lib/supabase";
import {
  createOrUpdatePatient,
  getPatientByPhone,
  parseOnboardingFromTranscript,
} from "@/lib/patient";
import type { BolnaWebhookPayload } from "@/lib/types";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

type WebhookBody = BolnaWebhookPayload & {
  from?: string;
  caller_id?: string;
  metadata?: { from?: string };
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as WebhookBody;

  console.log("Bolna webhook received:", JSON.stringify(body, null, 2));

  const call_id = body.call_id;
  const status = body.status;
  const transcript = body.transcript;
  const duration = body.duration;
  const medication_taken = body.extracted_data?.medication_taken;
  const action_required = body.extracted_data?.action_required;
  const patient_concern = body.extracted_data?.patient_concern;
  const extractedRecord = body.extracted_data as
    | Record<string, unknown>
    | undefined;
  const caller_phone = body.from ?? body.caller_id ?? body.metadata?.from;

  let patient = caller_phone ? await getPatientByPhone(caller_phone) : null;

  let patient_name =
    typeof extractedRecord?.patient_name === "string"
      ? extractedRecord.patient_name
      : "Unknown";
  let familySmsTo = process.env.FAMILY_PHONE_NUMBER!;

  if (!patient || !patient.onboarded) {
    const parsed = parseOnboardingFromTranscript(transcript ?? "");
    if (caller_phone) {
      const updated = await createOrUpdatePatient(caller_phone, {
        ...parsed,
        family_phone: process.env.FAMILY_PHONE_NUMBER,
        onboarded: true,
      });
      if (updated) {
        patient = updated;
        if (updated.name) {
          patient_name = updated.name;
        } else if (parsed.name) {
          patient_name = parsed.name;
        }
      } else if (parsed.name) {
        patient_name = parsed.name;
      }
    }
  } else {
    patient_name = patient.name ?? patient_name;
    familySmsTo = patient.family_phone ?? familySmsTo;
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

  if (needsAlert) {
    const patientLabel =
      patient_name !== "Unknown" ? patient_name : "Your parent";
    let reason = "needs your attention.";
    if (status === "no-answer")
      reason = "did not answer the medication reminder call.";
    else if (medication_taken === "no")
      reason = "has not taken their medication.";
    else if (patient_concern) reason = patient_concern;

    try {
      await twilioClient.messages.create({
        body: `Setu alert: ${patientLabel} ${reason} Please call them.`,
        from: process.env.TWILIO_FROM_NUMBER!,
        to: familySmsTo,
      });
      console.log("SMS alert sent to family");
    } catch (error) {
      console.error("Failed to send SMS alert:", error);
    }
  }

  return NextResponse.json({ received: true });
}
