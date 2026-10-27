import { NextRequest, NextResponse } from "next/server";
import { computePatientAdherence7d } from "@/lib/patientAdherence";
import { getNextScheduledCall } from "@/lib/patientSchedule";
import { supabase } from "@/lib/supabase";
import type { CallLog } from "@/lib/types";

type RouteContext = { params: { patient_id: string } };

export async function GET(request: NextRequest, context: RouteContext) {
  const patientId = context.params.patient_id?.trim();
  const orgId = request.nextUrl.searchParams.get("org_id")?.trim();

  if (!patientId || !orgId) {
    return NextResponse.json(
      { error: "patient_id and org_id are required" },
      { status: 400 },
    );
  }

  const patientSelectWithActive =
    "id, phone, name, location, medications, reminder_time, protocol, org_id, is_active, onboarded";
  const patientSelectLegacy =
    "id, phone, name, location, medications, reminder_time, protocol, org_id, onboarded";

  let patientResult = await supabase
    .from("patients")
    .select(patientSelectWithActive)
    .eq("id", patientId)
    .maybeSingle();

  if (
    patientResult.error?.code === "42703" &&
    patientResult.error.message?.includes("is_active")
  ) {
    patientResult = await supabase
      .from("patients")
      .select(patientSelectLegacy)
      .eq("id", patientId)
      .maybeSingle();
  }

  const { data: patient, error: patientError } = patientResult;

  if (patientError) {
    console.error("org patient GET failed:", patientError);
    return NextResponse.json(
      { error: "Failed to load patient" },
      { status: 500 },
    );
  }

  if (!patient || patient.org_id !== orgId) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  let callQuery = supabase
    .from("call_logs")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (patient.name) {
    callQuery = callQuery.eq("patient_name", patient.name);
  }

  const { data: callRows, error: callsError } = await callQuery;

  if (callsError) {
    console.error("org patient calls failed:", callsError);
    return NextResponse.json(
      { error: "Failed to load call history" },
      { status: 500 },
    );
  }

  const calls = (callRows ?? []) as CallLog[];

  let adherenceCalls: CallLog[] = [];
  if (patient.name) {
    const { data: adherenceRows } = await supabase
      .from("call_logs")
      .select("*")
      .eq("org_id", orgId)
      .eq("patient_name", patient.name)
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false });
    adherenceCalls = (adherenceRows ?? []) as CallLog[];
  }

  const { adherencePercent, byDay } =
    computePatientAdherence7d(adherenceCalls);

  const nextScheduledCall = getNextScheduledCall(
    patient.reminder_time as string | null,
  );

  return NextResponse.json({
    patient: {
      id: patient.id as string,
      phone: patient.phone as string,
      name: (patient.name as string | null) ?? null,
      location: (patient.location as string | null) ?? null,
      medications: (patient.medications as string | null) ?? null,
      reminder_time: (patient.reminder_time as string | null) ?? null,
      protocol: (patient.protocol as string | null) ?? null,
      is_active: patient.is_active !== false,
    },
    calls,
    adherencePercent7d: adherencePercent,
    adherenceByDay: byDay,
    nextScheduledCall,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const patientId = context.params.patient_id?.trim();
  let body: { org_id?: string; is_active?: boolean };

  try {
    body = (await request.json()) as { org_id?: string; is_active?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orgId = body.org_id?.trim();
  if (!patientId || !orgId) {
    return NextResponse.json(
      { error: "patient_id and org_id are required" },
      { status: 400 },
    );
  }

  const { data: patient, error: lookupError } = await supabase
    .from("patients")
    .select("id, org_id")
    .eq("id", patientId)
    .maybeSingle();

  if (lookupError || !patient || patient.org_id !== orgId) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  if (body.is_active !== false && body.is_active !== true) {
    return NextResponse.json(
      { error: "is_active must be true or false" },
      { status: 400 },
    );
  }
  const is_active = body.is_active === true;

  const { error: updateError } = await supabase
    .from("patients")
    .update({ is_active })
    .eq("id", patientId);

  if (updateError) {
    console.error("org patient PATCH failed:", updateError);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, is_active });
}
