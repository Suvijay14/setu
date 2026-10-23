import { NextRequest, NextResponse } from "next/server";
import { normalizeFamilyPhone } from "@/lib/dashboardClient";
import { createOrUpdatePatient } from "@/lib/patient";

type SetupBody = {
  parent_name?: string;
  parent_phone?: string;
  medications?: string;
  reminder_time?: string;
  location?: string;
  family_phone?: string;
};

function normalizeMedications(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");
}

export async function POST(request: NextRequest) {
  let body: SetupBody;

  try {
    body = (await request.json()) as SetupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parent_name = body.parent_name?.trim();
  const parent_phoneRaw = body.parent_phone?.trim();
  const medicationsRaw = body.medications?.trim() ?? "";
  const reminder_time = body.reminder_time?.trim();
  const location = body.location?.trim();
  const family_phoneRaw = body.family_phone?.trim();

  if (
    !parent_name ||
    !parent_phoneRaw ||
    !reminder_time ||
    !location ||
    !family_phoneRaw
  ) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 },
    );
  }

  const parent_phone = normalizeFamilyPhone(parent_phoneRaw);
  const family_phone = normalizeFamilyPhone(family_phoneRaw);

  if (!parent_phone || !family_phone) {
    return NextResponse.json(
      { error: "Phone numbers must be valid (+91XXXXXXXXXX)" },
      { status: 400 },
    );
  }

  const medications = normalizeMedications(medicationsRaw);

  const patient = await createOrUpdatePatient(parent_phone, {
    name: parent_name,
    medications: medications || undefined,
    reminder_time,
    family_phone,
    location,
    onboarded: true,
  });

  if (!patient) {
    return NextResponse.json(
      { error: "Failed to save patient" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, patient });
}
