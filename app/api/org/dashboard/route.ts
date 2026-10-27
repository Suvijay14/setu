import { NextRequest, NextResponse } from "next/server";
import { computeOrgStats, enrichOrgPatients } from "@/lib/orgStats";
import { sortOrgDashboardCalls } from "@/lib/sortOrgCalls";
import { fetchOrgPatients } from "@/lib/orgPatientsQuery";
import { supabase } from "@/lib/supabase";
import type { CallLog } from "@/lib/types";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("org_id")?.trim();

  if (!orgId) {
    return NextResponse.json({ error: "org_id is required" }, { status: 400 });
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, type")
    .eq("id", orgId)
    .maybeSingle();

  if (orgError) {
    console.error("org dashboard org lookup failed:", orgError);
    return NextResponse.json(
      { error: "Failed to load organization" },
      { status: 500 },
    );
  }

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: patients, error: patientsError } = await fetchOrgPatients(
    orgId,
    "id, phone, name, location, onboarded, reminder_time",
  );

  if (patientsError) {
    console.error("org dashboard patients failed:", patientsError);
    return NextResponse.json(
      {
        error: "Failed to load patients",
        detail: patientsError.message,
      },
      { status: 500 },
    );
  }

  const { data: callRows, error: callsError } = await supabase
    .from("call_logs")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (callsError) {
    console.error("org dashboard call_logs failed:", callsError);
    return NextResponse.json(
      { error: "Failed to load call logs" },
      { status: 500 },
    );
  }

  const calls = sortOrgDashboardCalls((callRows ?? []) as CallLog[]);
  const patientList = patients ?? [];
  const stats = computeOrgStats(calls, patientList.length);
  const enrichedPatients = enrichOrgPatients(patientList, calls);

  return NextResponse.json({
    org: {
      id: org.id as string,
      name: org.name as string,
      type: org.type as string,
    },
    patients: enrichedPatients,
    calls,
    stats,
  });
}
