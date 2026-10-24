import { NextRequest, NextResponse } from "next/server";
import { normalizeFamilyPhone } from "@/lib/dashboardClient";
import { supabase } from "@/lib/supabase";

const ALLOWED_FREQUENCIES = new Set([
  "daily",
  "every2days",
  "weekly",
  "never",
]);

export async function POST(request: NextRequest) {
  let body: {
    family_phone?: string;
    frequency?: string;
    time?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const familyPhoneRaw = body.family_phone?.trim();
  const frequency = body.frequency?.trim();
  const time = body.time?.trim();

  if (!familyPhoneRaw || !frequency || !time) {
    return NextResponse.json(
      { error: "family_phone, frequency, and time are required" },
      { status: 400 },
    );
  }

  if (!ALLOWED_FREQUENCIES.has(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json(
      { error: "time must be HH:MM" },
      { status: 400 },
    );
  }

  const familyPhone = normalizeFamilyPhone(familyPhoneRaw) ?? familyPhoneRaw;

  const { error } = await supabase
    .from("patients")
    .update({
      child_summary_frequency: frequency,
      child_summary_time: time,
    })
    .eq("family_phone", familyPhone);

  if (error) {
    console.error("update-summary-settings failed:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
