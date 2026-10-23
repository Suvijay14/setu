import { supabase } from "@/lib/supabase";
import type { GroqOnboardingExtract } from "@/lib/types";

export interface Patient {
  phone: string;
  name: string | null;
  medications: string | null;
  reminder_time: string | null;
  family_phone: string | null;
  location: string | null;
  onboarded: boolean;
}

export type PatientUpdateData = Partial<{
  name: string;
  medications: string;
  reminder_time: string;
  family_phone: string;
  location: string;
  onboarded: boolean;
}>;

export interface OnboardingExtract {
  name?: string;
  medications?: string;
  reminder_time?: string;
  family_phone?: string;
  location?: string;
}

export function buildGroqOnboardingUpsert(
  data: GroqOnboardingExtract,
): PatientUpdateData {
  const onboarded = !!(data.name && data.reminder_time);

  return {
    ...(data.name ? { name: data.name } : {}),
    ...(data.medications ? { medications: data.medications } : {}),
    ...(data.reminder_time ? { reminder_time: data.reminder_time } : {}),
    family_phone: data.family_phone ?? process.env.FAMILY_PHONE_NUMBER,
    ...(data.location ? { location: data.location } : {}),
    onboarded,
  };
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

const NAME_FILLER_WORDS = new Set([
  "kya",
  "hai",
  "hoon",
  "main",
  "mera",
  "aap",
  "ji",
  "nahi",
  "tha",
  "thi",
]);

function capitalizeExtractedName(words: string[]): string {
  return words
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

function extractPatientNameFromUserLines(userLines: string[]): string | null {
  const namePatterns = [
    /mera\s+naam\s+(.+?)\s+hai\b/i,
    /naam\s+(.+?)\s+hai\b/i,
    /मेरा\s+नाम\s+(.+?)\s+है/,
    /नाम\s+(.+?)\s+है/,
  ];

  for (const line of userLines) {
    const content = line.replace(/^user:\s*/i, "").trim();

    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const rawName = match[1].replace(/[।.]+$/g, "").trim();
      const words = rawName
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean)
        .filter((word) => !NAME_FILLER_WORDS.has(word.toLowerCase()))
        .slice(0, 3);

      if (words.length >= 1 && words.length <= 3) {
        return capitalizeExtractedName(words);
      }
    }
  }

  return null;
}

function normalizeLocation(raw: string): string {
  return raw
    .replace(/[।.]+$/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function extractLocationFromUserLines(userLines: string[]): string | null {
  const locationPatterns = [
    /mera\s+area\s+(.+?)(?:\s+hai\b|[,.]|$)/i,
    /\bmain\s+(.+?)\s+(?:mein|rehta|rehti)\b/i,
    /(.+?)\s+mein\s+reht[ei]\s+hoon/i,
    /reht[ei]\s+hoon\s+(.+?)(?:\s+mein\b)?(?:[,.]|$)/i,
    /([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s-]{1,40})\s+mein\b/i,
  ];

  const foundParts: string[] = [];

  for (const line of userLines) {
    const content = line.replace(/^user:\s*/i, "").trim();

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const place = normalizeLocation(match[1]);
      if (place.length >= 2 && !foundParts.includes(place)) {
        foundParts.push(place);
      }
    }
  }

  if (foundParts.length === 0) {
    return null;
  }

  if (foundParts.length === 1) {
    return foundParts[0];
  }

  const cityMatch = foundParts.find((part) =>
    /^(Delhi|Mumbai|Bengaluru|Bangalore|Chennai|Kolkata|Hyderabad|Pune|Jaipur|Noida|Gurgaon|Gurugram)$/i.test(
      part,
    ),
  );
  const areaMatch = foundParts.find((part) => part !== cityMatch);

  if (areaMatch && cityMatch) {
    return `${areaMatch} ${cityMatch}`;
  }

  return foundParts.slice(0, 2).join(" ");
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

  const userLines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^user:/i.test(line));

  const extractedName = extractPatientNameFromUserLines(userLines);
  if (extractedName) {
    result.name = extractedName;
  }

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

  const extractedLocation = extractLocationFromUserLines(userLines);
  if (extractedLocation) {
    result.location = extractedLocation;
  }

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
