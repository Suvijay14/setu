import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import {
  buildInboundAppointmentSmsBody,
  normalizeAppointment,
} from "@/lib/appointments";
import { supabase } from "@/lib/supabase";

type InboundBody = {
  patient_name?: string;
  phone?: string;
  symptoms?: string;
  preferred_time?: string;
  doctor?: string;
  from?: string;
  caller_id?: string;
  extracted_data?: Record<string, unknown>;
  user_data?: Record<string, unknown>;
};

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export async function POST(request: NextRequest) {
  let body: InboundBody;
  try {
    body = (await request.json()) as InboundBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const extracted = body.extracted_data ?? {};
  const userData = body.user_data ?? {};

  const patient_name =
    pickString(
      body.patient_name,
      extracted.patient_name,
      userData.patient_name,
    ) || "Unknown";
  const phone =
    pickString(body.phone, body.from, body.caller_id, userData.phone) ||
    "Unknown";
  const symptoms =
    pickString(body.symptoms, extracted.symptoms, userData.symptoms) ||
    "Not specified";
  const preferred_time =
    pickString(
      body.preferred_time,
      extracted.preferred_time,
      userData.preferred_time,
    ) || "Flexible";
  const doctor =
    pickString(body.doctor, extracted.doctor, userData.doctor) || "Dr. Sharma";
  const clinic_name = "Apollo Clinic, Delhi";

  const { data: inserted, error: insertError } = await supabase
    .from("appointments")
    .insert({
      patient_name,
      phone,
      symptoms,
      preferred_time,
      doctor,
      source: "inbound",
      status: "pending",
      clinic_name,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("inbound-call insert failed:", insertError);
    return NextResponse.json(
      { error: "Failed to save appointment", detail: insertError.message },
      { status: 500 },
    );
  }

  const to = process.env.FAMILY_PHONE_NUMBER?.trim();
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER &&
    to
  ) {
    const smsBody = buildInboundAppointmentSmsBody({
      patient_name,
      phone,
      symptoms,
      preferred_time,
      doctor,
      clinic_name,
    });
    try {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
      await client.messages.create({
        from: process.env.TWILIO_FROM_NUMBER,
        to,
        body: smsBody,
      });
    } catch (error) {
      console.error("inbound-call SMS failed:", error);
    }
  } else {
    console.warn("inbound-call: Twilio or FAMILY_PHONE_NUMBER not configured");
  }

  return NextResponse.json({
    success: true,
    appointment: inserted ? normalizeAppointment(inserted) : null,
  });
}
