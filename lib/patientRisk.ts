import type { CallLog } from "@/lib/types";

export type PatientRiskLevel = "high" | "medium" | "low" | "none";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isMissedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s === "no-answer" ||
    s === "missed" ||
    s === "failed" ||
    s === "busy" ||
    s === "no_answer"
  );
}

function normalizeMood(mood: string | null | undefined): string {
  return (mood ?? "").trim().toLowerCase();
}

function isEscalation(call: CallLog): boolean {
  return call.escalation_flag === true || call.emergency === true;
}

function callsForPatient(allCalls: CallLog[], patientName: string): CallLog[] {
  const key = patientName.trim();
  return allCalls.filter((c) => c.patient_name?.trim() === key);
}

function formatEscalationDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function computePatientRisk(
  allCalls: CallLog[],
  patientName: string | null,
): { level: PatientRiskLevel; reason: string } {
  const nameKey = patientName?.trim() ?? "";
  if (!nameKey) {
    return { level: "none", reason: "No calls completed yet" };
  }

  const patientCalls = callsForPatient(allCalls, nameKey);
  if (patientCalls.length === 0) {
    return { level: "none", reason: "No calls completed yet" };
  }

  const completedCalls = patientCalls.filter(
    (c) => c.status?.toLowerCase() === "completed",
  );
  if (completedCalls.length === 0) {
    return { level: "none", reason: "No calls completed yet" };
  }

  const latest = patientCalls[0]!;
  const lastThree = patientCalls.slice(0, 3);
  const mood = normalizeMood(latest.mood);

  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const recentEscalation = patientCalls.find(
    (c) => c.created_at >= cutoff && isEscalation(c),
  );

  if (latest.medication_taken === "no") {
    return { level: "high", reason: "Missed medication on last call" };
  }

  if (mood === "distressed" || mood === "confused") {
    return {
      level: "high",
      reason: `Patient mood reported as ${latest.mood} on last call`,
    };
  }

  if (recentEscalation) {
    return {
      level: "high",
      reason: `Escalation triggered ${formatEscalationDate(recentEscalation.created_at)}`,
    };
  }

  if (mood === "tired" || mood === "low") {
    return {
      level: "medium",
      reason: `Patient mood reported as ${latest.mood} on last call`,
    };
  }

  if (latest.medication_taken === "yes") {
    const attentionInLastThree = lastThree.filter(
      (c) =>
        isMissedStatus(c.status) ||
        c.medication_taken === "no" ||
        c.medication_taken === "unclear",
    ).length;
    if (attentionInLastThree >= 1) {
      return {
        level: "medium",
        reason: "Missed or unclear medication in 1 of last 3 calls",
      };
    }
  }

  const lastThreeAllYes =
    lastThree.length > 0 &&
    lastThree.every(
      (c) =>
        c.status?.toLowerCase() === "completed" &&
        c.medication_taken === "yes",
    );

  if (
    lastThreeAllYes &&
    (mood === "good" || mood === "positive" || mood === "happy")
  ) {
    return {
      level: "low",
      reason: "Medication taken on recent calls; mood positive",
    };
  }

  if (latest.medication_taken === "yes") {
    return {
      level: "low",
      reason: "Medication taken on last call",
    };
  }

  return { level: "none", reason: "Insufficient recent call data" };
}
