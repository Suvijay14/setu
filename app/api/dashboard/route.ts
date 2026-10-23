import { NextRequest, NextResponse } from "next/server";
import { normalizeFamilyPhone } from "@/lib/dashboardClient";
import { supabase } from "@/lib/supabase";
import type { CallLog } from "@/lib/types";

export async function GET(request: NextRequest) {
  const rawPhone = request.nextUrl.searchParams.get("family_phone")?.trim();

  if (!rawPhone) {
    return NextResponse.json(
      { error: "family_phone is required" },
      { status: 400 },
    );
  }

  const familyPhone = normalizeFamilyPhone(rawPhone) ?? rawPhone;

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select(
      "phone, name, location, medications, reminder_time, onboarded, family_phone",
    )
    .eq("family_phone", familyPhone)
    .limit(1)
    .maybeSingle();

  if (patientError) {
    console.error("Dashboard patient lookup failed:", patientError);
    return NextResponse.json(
      { error: "Failed to load patient" },
      { status: 500 },
    );
  }

  if (!patient) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let calls: CallLog[] = [];

  if (patient.name) {
    const { data: callRows, error: callsError } = await supabase
      .from("call_logs")
      .select("*")
      .eq("patient_name", patient.name)
      .order("created_at", { ascending: false })
      .limit(50);

    if (callsError) {
      console.error("Dashboard call_logs fetch failed:", callsError);
      return NextResponse.json(
        { error: "Failed to load call logs" },
        { status: 500 },
      );
    }

    calls = (callRows ?? []) as CallLog[];
  }

  return NextResponse.json({
    patient: {
      phone: patient.phone,
      name: patient.name ?? null,
      location: patient.location ?? null,
      medications: patient.medications ?? null,
      reminder_time: patient.reminder_time ?? null,
      onboarded: patient.onboarded ?? false,
    },
    calls,
  });
}
