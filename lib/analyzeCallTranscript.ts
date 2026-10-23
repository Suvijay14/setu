import type { MedicationTaken, YesNo } from "@/lib/types";

const MEDICATION_NO_PATTERNS = [
  /nahi\s+li/i,
  /nahin/i,
  /\bnahi\b/i,
  /नहीं/,
  /नही/,
];

const MEDICATION_YES_PATTERNS = [
  /le\s+liya/i,
  /le\s+li/i,
  /leli/i,
  /ले\s+ली/,
  /हाँ/,
  /लेली/,
  /\bhaan\b/i,
  /\bli\b/i,
];

const HEALTH_COMPLAINT_PATTERN =
  /dard|pain|gir|fell|emergency|tabiyat\s+theek\s+nahi|बीमार|दर्द|गिर|theek\s+nahi|bimar|tabiyat/i;

const SMS_EMERGENCY_PATTERN =
  /dard|chest pain|seene mein|gir gaya|gir gayi|saans nahi|behosh|दर्द|गिर/i;

function getUserTranscriptText(transcript: string): string {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^user:/i.test(line))
    .map((line) => line.replace(/^user:\s*/i, "").trim())
    .join("\n");
}

export function parseMedicationTakenFromTranscript(
  transcript: string,
): MedicationTaken {
  const userText = getUserTranscriptText(transcript);

  for (const pattern of MEDICATION_NO_PATTERNS) {
    if (pattern.test(userText)) {
      return "no";
    }
  }

  for (const pattern of MEDICATION_YES_PATTERNS) {
    if (pattern.test(userText)) {
      return "yes";
    }
  }

  return "unclear";
}

export function parseActionRequiredFromTranscript(
  transcript: string,
  medicationTaken: MedicationTaken,
): YesNo {
  if (medicationTaken === "no") {
    return "yes";
  }

  const userText = getUserTranscriptText(transcript);

  if (HEALTH_COMPLAINT_PATTERN.test(userText)) {
    return "yes";
  }

  return "no";
}

export function getEmergencyConcernForSms(transcript: string): string | null {
  const userLines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^user:/i.test(line))
    .map((line) => line.replace(/^user:\s*/i, "").trim())
    .filter(Boolean);

  for (const line of userLines) {
    if (SMS_EMERGENCY_PATTERN.test(line)) {
      return line.slice(0, 80);
    }
  }

  return null;
}

export function parsePatientConcernFromTranscript(
  transcript: string,
): string | null {
  const userLines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^user:/i.test(line))
    .map((line) => line.replace(/^user:\s*/i, "").trim())
    .filter((line) => HEALTH_COMPLAINT_PATTERN.test(line));

  if (userLines.length === 0) {
    return null;
  }

  return userLines.join(" | ");
}

export function analyzeCallTranscript(transcript: string): {
  medication_taken: MedicationTaken;
  action_required: YesNo;
  patient_concern: string | null;
} {
  const medication_taken = parseMedicationTakenFromTranscript(transcript);
  const action_required = parseActionRequiredFromTranscript(
    transcript,
    medication_taken,
  );
  const patient_concern = parsePatientConcernFromTranscript(transcript);

  return { medication_taken, action_required, patient_concern };
}
