import { NextRequest, NextResponse } from "next/server";
import { fetchOrgPatients } from "@/lib/orgPatientsQuery";
import { supabase } from "@/lib/supabase";
import {
  groupRefillsByMedicine,
  latestRefillEntries,
  patientNameMap,
} from "@/lib/refills";
import type { CallLog } from "@/lib/types";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("org_id")?.trim();

  if (!orgId) {
    return NextResponse.json({ error: "org_id is required" }, { status: 400 });
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, pharmacy_phone")
    .eq("id", orgId)
    .maybeSingle();

  if (orgError) {
    console.error("org refills org lookup failed:", orgError);
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
    "id, name, phone, location",
  );

  if (patientsError) {
    console.error("org refills patients failed:", patientsError);
    return NextResponse.json(
      { error: "Failed to load patients" },
      { status: 500 },
    );
  }

  const { data: callRows, error: callsError } = await supabase
    .from("call_logs")
    .select("*")
    .eq("org_id", orgId)
    .eq("refill_needed", true)
    .order("created_at", { ascending: false })
    .limit(500);

  if (callsError) {
    console.error("org refills call_logs failed:", callsError);
    return NextResponse.json(
      { error: "Failed to load refill calls" },
      { status: 500 },
    );
  }

  const patientList = (patients ?? []) as Array<{
    id: string;
    name: string | null;
    phone: string;
    location: string | null;
  }>;
  const nameMap = patientNameMap(patientList);
  const entries = latestRefillEntries(
    (callRows ?? []) as CallLog[],
    nameMap,
  );
  const byMedicine = groupRefillsByMedicine(entries);

  return NextResponse.json({
    org: {
      id: org.id as string,
      name: org.name as string,
      pharmacy_phone:
        typeof org.pharmacy_phone === "string" ? org.pharmacy_phone : null,
    },
    totalPatients: entries.length,
    entries,
    byMedicine,
  });
}
