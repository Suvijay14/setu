import type { CallLog, MedicationTaken, YesNo } from "@/lib/types";

export type DashboardPatient = {
  phone: string;
  name: string | null;
  location: string | null;
  medications: string | null;
  reminder_time: string | null;
  onboarded: boolean;
  child_summary_frequency: string | null;
  child_summary_time: string | null;
};

export type DashboardApiSuccess = {
  patient: DashboardPatient;
  calls: CallLog[];
};

export const FAMILY_PHONE_STORAGE_KEY = "setu_family_phone";

export function normalizeFamilyPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (input.trim().startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }
  return null;
}

export function computeDashboardStats(calls: CallLog[]): {
  callsToday: number;
  compliancePercent: number | null;
} {
  const todayStart = getTodayStartIsoIST();

  const callsToday = calls.filter(
    (log) => log.created_at >= todayStart,
  ).length;

  const completed = calls.filter(
    (log) => log.status && log.status !== "no-answer",
  );
  const takenYes = completed.filter(
    (log) => log.medication_taken === "yes",
  ).length;
  const compliancePercent =
    completed.length > 0
      ? Math.round((takenYes / completed.length) * 100)
      : null;

  return { callsToday, compliancePercent };
}

function getTodayStartIsoIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}T00:00:00+05:30`;
}

export function isCallEscalation(log: {
  emergency?: boolean | null;
  escalation_flag?: boolean | null;
}): boolean {
  return log.escalation_flag === true || log.emergency === true;
}

export function rowHighlightClass(log: {
  medication_taken: MedicationTaken | null;
  action_required: YesNo | null;
  emergency: boolean | null;
  escalation_flag?: boolean | null;
}): string {
  if (isCallEscalation(log) || log.action_required === "yes") {
    return "bg-red-950/50 hover:bg-red-950/70";
  }
  if (log.medication_taken === "no") {
    return "bg-yellow-950/40 hover:bg-yellow-950/60";
  }
  if (log.medication_taken === "yes") {
    return "bg-emerald-950/40 hover:bg-emerald-950/60";
  }
  return "hover:bg-zinc-800/50";
}

export function formatDashboardDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
