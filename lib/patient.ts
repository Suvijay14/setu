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

export interface OnboardingExtract {
  name?: string;
  medications?: string;
  reminder_time?: string;
  family_phone?: string;
}

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

export function isOnboardingTranscript(transcript: string): boolean {
  const hasNaam = /naam|नाम/i.test(transcript);
  const hasMedication =
    /dawai|davai|tablet|medicine|दवाई|दवा|BP|diabetes/i.test(transcript);
  const hasTime =
    /baje|time|\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*baje/i.test(transcript);

  // Bolna may send name + meds before time in a later webhook chunk.
  return (
    hasNaam &&
    hasMedication &&
    (hasTime || /BP\b|diabetes/i.test(transcript))
  );
}

function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseReminderTimeFromTranscript(
  transcript: string,
): string | undefined {
  const colonMatch = transcript.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);
  if (colonMatch) {
    return formatHourMinute(
      parseInt(colonMatch[1], 10),
      parseInt(colonMatch[2], 10),
    );
  }

  const bajeMatch = transcript.match(/\b(\d{1,2})\s*baje\b/i);
  if (bajeMatch) {
    let hour = parseInt(bajeMatch[1], 10);
    const evening =
      /shaam|raat|evening|pm|night|रात|शाम|संध्य/i.test(transcript);
    const morning = /subah|morning|am|सुबह/i.test(transcript);

    if (evening && hour < 12) {
      hour += 12;
    } else if (!morning && !evening && hour >= 1 && hour <= 11) {
      // Ambiguous "N baje" without subah/shaam: keep morning hour (24h HH:MM).
    }

    return formatHourMinute(hour, 0);
  }

  return undefined;
}

function extractFamilyPhone(transcript: string): string | undefined {
  const withCountry = transcript.match(/\+91[\s-]?[6-9]\d{9}\b/);
  if (withCountry) {
    return withCountry[0].replace(/[\s-]/g, "");
  }

  const tenDigit = transcript.match(/\b([6-9]\d{9})\b/);
  if (tenDigit) {
    return `+91${tenDigit[1]}`;
  }

  return undefined;
}

export function parseOnboardingCallTranscript(
  transcript: string,
): OnboardingExtract {
  const result: OnboardingExtract = {};

  const namePatterns = [
    /mera\s+naam\s+(.+?)(?:\s+hai\b|[\n\r]|$)/i,
    /(?:^|\n)\s*user:\s*[^.\n]*naam\s+(.+?)(?:\s+hai\b|[\n\r]|$)/i,
    /naam\s+(.+?)(?:\s+hai\b|[\n\r]|$)/i,
    /मेरा\s+नाम\s+(.+?)(?:\s+है|[\n\r]|$)/,
    /नाम\s+(.+?)(?:\s+है|[\n\r]|$)/,
  ];

  for (const pattern of namePatterns) {
    const match = transcript.match(pattern);
    if (match?.[1]) {
      result.name = match[1].replace(/[।.]+$/g, "").trim();
      break;
    }
  }

  const userLines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^user:/i.test(line));

  const medicationLine = userLines.find((line) =>
    /BP|diabetes|dawai|davai|tablet|medicine|दवाई|दवा/i.test(line),
  );

  if (medicationLine) {
    result.medications = medicationLine.replace(/^user:\s*/i, "").trim();
  } else {
    const bpMatch = transcript.match(
      /((?:BP|Diabetes)[^.\n।]+(?:दवाई|dawai|medicine|tablet)[^.\n।]*)/i,
    );
    if (bpMatch?.[1]) {
      result.medications = bpMatch[1].trim();
    } else {
      const dawaiMatch = transcript.match(
        /(?:dawai|davai|medicine|tablet|दवाई)[:\s]*([^.\n]+)/i,
      );
      if (dawaiMatch?.[0]) {
        result.medications = dawaiMatch[0].trim();
      }
    }
  }

  result.reminder_time = parseReminderTimeFromTranscript(transcript);
  result.family_phone = extractFamilyPhone(transcript);

  return result;
}

/** @deprecated Use parseOnboardingCallTranscript for Bolna onboarding calls */
export function parseOnboardingFromTranscript(transcript: string): Partial<{
  name: string;
  medications: string;
  reminder_time: string;
}> {
  return parseOnboardingCallTranscript(transcript);
}
