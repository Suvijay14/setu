import type { CallLog, MedicationTaken } from "@/lib/types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type DayAdherence = {
  date: string;
  taken: MedicationTaken | "none";
};

function istDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function computePatientAdherence7d(calls: CallLog[]): {
  adherencePercent: number | null;
  byDay: DayAdherence[];
} {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const recent = calls.filter((c) => c.created_at >= cutoff);

  const yesCount = recent.filter((c) => c.medication_taken === "yes").length;
  const adherencePercent =
    recent.length > 0
      ? Math.round((yesCount / recent.length) * 100)
      : null;

  const byDayMap = new Map<string, DayAdherence["taken"]>();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    byDayMap.set(istDateKey(d.toISOString()), "none");
  }

  for (const call of recent) {
    const key = istDateKey(call.created_at);
    if (!byDayMap.has(key)) continue;
    const taken = call.medication_taken;
    if (taken === "yes" || taken === "no" || taken === "unclear") {
      const existing = byDayMap.get(key);
      if (existing === "none" || existing === "unclear") {
        byDayMap.set(key, taken);
      }
    }
  }

  const byDay: DayAdherence[] = Array.from(byDayMap.entries()).map(
    ([date, taken]) => ({
      date,
      taken,
    }),
  );

  return { adherencePercent, byDay };
}
