import { supabase } from "@/lib/supabase";

export interface Patient {
  phone: string;
  name: string | null;
  medications: string | null;
  reminder_time: string | null;
  family_phone: string | null;
  onboarded: boolean;
}

export type PatientUpdateData = Partial<{
  name: string;
  medications: string;
  reminder_time: string;
  family_phone: string;
  onboarded: boolean;
}>;

export async function getPatientByPhone(
  phone: string,
): Promise<Patient | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("getPatientByPhone failed:", error);
    return null;
  }

  return data as Patient | null;
}

export async function createOrUpdatePatient(
  phone: string,
  data: PatientUpdateData,
): Promise<Patient | null> {
  const { data: row, error } = await supabase
    .from("patients")
    .upsert({ phone, ...data }, { onConflict: "phone" })
    .select()
    .single();

  if (error) {
    console.error("createOrUpdatePatient failed:", error);
    return null;
  }

  return row as Patient;
}

export function parseOnboardingFromTranscript(transcript: string): Partial<{
  name: string;
  medications: string;
  reminder_time: string;
}> {
  const result: Partial<{
    name: string;
    medications: string;
    reminder_time: string;
  }> = {};

  const nameMatch = transcript.match(/mera naam\s+(.+?)\s+hai/i);
  if (nameMatch?.[1]) {
    result.name = nameMatch[1].trim();
  }

  const timeColonMatch = transcript.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (timeColonMatch) {
    result.reminder_time = `${timeColonMatch[1].padStart(2, "0")}:${timeColonMatch[2]}`;
  } else {
    const bajeMatch = transcript.match(/\b(\d{1,2})\s*baje/i);
    if (bajeMatch) {
      result.reminder_time = `${bajeMatch[1].padStart(2, "0")}:00`;
    }
  }

  const medMatch = transcript.match(
    /(?:dawai|davai|medicine|tablet|dawa)[\s:]+([^.,\n]+)/i,
  );
  if (medMatch?.[1]) {
    result.medications = medMatch[1].trim();
  }

  return result;
}
