import { NextRequest, NextResponse } from "next/server";
import { normalizeFamilyPhone } from "@/lib/dashboardClient";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let body: { family_phone?: string; message?: string };
  try {
    body = (await request.json()) as { family_phone?: string; message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawPhone = body.family_phone?.trim();
  const message = body.message?.trim();

  if (!rawPhone || !message) {
    return NextResponse.json(
      { error: "family_phone and message are required" },
      { status: 400 },
    );
  }

  const familyPhone = normalizeFamilyPhone(rawPhone) ?? rawPhone;

  const { data: patient, error: lookupError } = await supabase
    .from("patients")
    .select("phone, name")
    .eq("family_phone", familyPhone)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("family-message lookup failed:", lookupError);
    return NextResponse.json(
      { error: "Failed to look up patient" },
      { status: 500 },
    );
  }

  if (!patient) {
    return NextResponse.json(
      { error: "No patient registered with this number" },
      { status: 404 },
    );
  }

  const { error: updateError } = await supabase
    .from("patients")
    .update({
      family_message: message,
      family_message_sent: false,
    })
    .eq("phone", patient.phone);

  if (updateError) {
    console.error("family-message update failed:", updateError);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    patient_name: patient.name ?? "Your family",
  });
}
