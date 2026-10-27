import { NextRequest, NextResponse } from "next/server";
import { parsePatientCsv } from "@/lib/csvPatients";
import { createOrUpdatePatient } from "@/lib/patient";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let body: { org_id?: string; csv_file_base64?: string };
  try {
    body = (await request.json()) as {
      org_id?: string;
      csv_file_base64?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const org_id = body.org_id?.trim();
  const csv_file_base64 = body.csv_file_base64?.trim();

  if (!org_id || !csv_file_base64) {
    return NextResponse.json(
      { error: "org_id and csv_file_base64 are required" },
      { status: 400 },
    );
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", org_id)
    .maybeSingle();

  if (orgError) {
    console.error("upload-patients org lookup failed:", orgError);
    return NextResponse.json(
      { error: "Failed to verify organization" },
      { status: 500 },
    );
  }

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  let csvText: string;
  try {
    csvText = Buffer.from(csv_file_base64, "base64").toString("utf-8");
  } catch {
    return NextResponse.json(
      { error: "Invalid csv_file_base64 encoding" },
      { status: 400 },
    );
  }

  const { rows, errors } = parsePatientCsv(csvText);

  if (
    errors.some((e) =>
      /Missing required columns|Too many rows|CSV is empty/.test(e.reason),
    )
  ) {
    return NextResponse.json({ success: 0, errors }, { status: 400 });
  }

  let success = 0;

  for (const row of rows) {
    const saved = await createOrUpdatePatient(row.phone, {
      name: row.name,
      medications: row.medications,
      reminder_time: row.reminder_time,
      location: row.location ?? undefined,
      protocol: row.protocol ?? undefined,
      org_id,
      onboarded: true,
    });

    if (!saved) {
      errors.push({
        row: row.sourceRow,
        reason: `Database save failed for ${row.phone}`,
      });
      continue;
    }

    success += 1;
  }

  return NextResponse.json({ success, errors });
}
