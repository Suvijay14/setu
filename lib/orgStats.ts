import type { CallLog } from "@/lib/types";
import type { OrgDashboardStats, OrgPatientRow } from "@/lib/orgClient";
import { countRefillsNeeded } from "@/lib/refills";
import { computePatientRisk } from "@/lib/patientRisk";

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

export function computeOrgStats(
  calls: CallLog[],
  totalPatients: number,
): OrgDashboardStats {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const recent = calls.filter((c) => c.created_at >= cutoff);
  const completed = recent.filter((c) => c.status === "completed");
  const yesCount = completed.filter(
    (c) => c.medication_taken === "yes",
  ).length;
  const adherencePercent =
    completed.length > 0
      ? Math.round((yesCount / completed.length) * 100)
      : null;

  return {
    totalPatients,
    callsLast7Days: recent.length,
    adherencePercent,
    missedOrNoAnswer: recent.filter((c) => isMissedStatus(c.status)).length,
    emergencyCount: recent.filter(
      (c) => c.emergency === true || c.escalation_flag === true,
    ).length,
    refillsNeededCount: countRefillsNeeded(calls),
  };
}

type PatientSource = {
  id: string;
  phone: string;
  name: string | null;
  location: string | null;
  onboarded: boolean;
  reminder_time: string | null;
};

export function enrichOrgPatients(
  patients: PatientSource[],
  calls: CallLog[],
): OrgPatientRow[] {
  const latestByName = new Map<string, CallLog>();
  for (const call of calls) {
    const key = call.patient_name?.trim();
    if (!key) continue;
    if (!latestByName.has(key)) {
      latestByName.set(key, call);
    }
  }

  return patients.map((patient) => {
    const nameKey = patient.name?.trim() ?? "";
    const latest = nameKey ? latestByName.get(nameKey) : undefined;

    const { level: risk_level, reason: risk_reason } = computePatientRisk(
      calls,
      patient.name,
    );

    let adherence_badge: OrgPatientRow["adherence_badge"] = "none";
    if (latest) {
      if (isMissedStatus(latest.status)) {
        adherence_badge = "missed";
      } else if (latest.medication_taken === "yes") {
        adherence_badge = "good";
      } else if (latest.medication_taken === "no") {
        adherence_badge = "missed";
      } else if (latest.medication_taken === "unclear") {
        adherence_badge = "watch";
      } else if (latest.status === "completed") {
        adherence_badge = "watch";
      }
    }

    return {
      id: patient.id,
      phone: patient.phone,
      name: patient.name,
      location: patient.location,
      onboarded: patient.onboarded,
      reminder_time: patient.reminder_time,
      last_call_status: latest?.status ?? null,
      last_medication_taken: latest?.medication_taken ?? null,
      adherence_badge,
      risk_level,
      risk_reason,
    };
  });
}
