import twilio from "twilio";
import { buildEscalationAppointmentSmsBody } from "@/lib/appointments";
import { supabase } from "@/lib/supabase";

export type EscalationSmsPayload = {
  patient_id: string;
  org_id: string;
  escalation_reason: string;
  call_transcript: string;
  patient_name: string;
};

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function first80Words(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 80).join(" ");
}

export function buildEscalationSmsBody(input: {
  patientName: string;
  phone: string;
  callSummary: string;
  dischargeDate?: string;
  doctor?: string;
  clinicName?: string;
}): string {
  return buildEscalationAppointmentSmsBody({
    patient_name: input.patientName,
    phone: input.phone,
    call_summary: first80Words(input.callSummary),
    discharge_date: input.dischargeDate?.trim() || "recent",
    doctor: input.doctor?.trim() || "Dr. Sharma",
    clinic_name: input.clinicName?.trim() || "Apollo Clinic, Delhi",
  });
}

function twilioFromNumber(): string | null {
  return (
    process.env.TWILIO_FROM_NUMBER?.trim() ||
    process.env.TWILIO_PHONE_NUMBER?.trim() ||
    null
  );
}

export async function sendEscalationSmsToClinic(
  payload: EscalationSmsPayload,
): Promise<{ sent: boolean; error?: string; skipped?: string }> {
  const { patient_id, org_id, escalation_reason, call_transcript, patient_name } =
    payload;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return { sent: false, skipped: "Twilio not configured" };
  }

  const from = twilioFromNumber();
  if (!from) {
    return { sent: false, skipped: "Missing TWILIO_FROM_NUMBER" };
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, admin_phone")
    .eq("id", org_id)
    .maybeSingle();

  if (orgError) {
    console.error("escalation org lookup failed:", orgError);
    return { sent: false, error: "Failed to load organization" };
  }

  const adminPhone =
    typeof org?.admin_phone === "string" ? org.admin_phone.trim() : "";
  if (!adminPhone) {
    return { sent: false, skipped: "No admin_phone on organization" };
  }

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, org_id, phone")
    .eq("id", patient_id)
    .maybeSingle();

  if (patientError || !patient || patient.org_id !== org_id) {
    return { sent: false, error: "Patient not found for organization" };
  }

  const phone =
    typeof patient.phone === "string" && patient.phone.trim()
      ? patient.phone.trim()
      : "Unknown";

  const body = buildEscalationSmsBody({
    patientName: patient_name,
    phone,
    callSummary: call_transcript || escalation_reason,
  });

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  try {
    await client.messages.create({
      from,
      to: adminPhone,
      body,
    });
    return { sent: true };
  } catch (error) {
    console.error("escalation SMS failed:", error);
    return { sent: false, error: "Twilio send failed" };
  }
}
