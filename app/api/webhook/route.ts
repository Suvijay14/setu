import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabase } from "@/lib/supabase";
import type { BolnaWebhookPayload } from "@/lib/types";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BolnaWebhookPayload;

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
  const patient_name =
    typeof extractedRecord?.patient_name === "string"
      ? extractedRecord.patient_name
      : "Unknown";

  console.log("Parsed webhook fields:", {
    call_id,
    status,
    transcript,
    duration,
    medication_taken,
    action_required,
    patient_concern,
    patient_name,
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
      (typeof extractedRecord?.patient_name === "string"
        ? extractedRecord.patient_name
        : undefined) || "Your parent";
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
        to: process.env.FAMILY_PHONE_NUMBER!,
      });
      console.log("SMS alert sent to family");
    } catch (error) {
      console.error("Failed to send SMS alert:", error);
    }
  }

  return NextResponse.json({ received: true });
}
