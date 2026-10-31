import type { CallLog } from "@/lib/types";

export const ORG_STORAGE_KEY = "setu_org";

/** Seeded in Supabase `organizations` for buildathon demos. */
export const DEMO_ORG_ACCESS_CODE = "DEMO-2026";
export const DEMO_ORG_NAME = "Demo Clinic";

export type StoredOrg = {
  id: string;
  name: string;
  type: string;
};

export type OrgPatientRow = {
  id: string;
  phone: string;
  name: string | null;
  location: string | null;
  onboarded: boolean;
  reminder_time: string | null;
  last_call_status: string | null;
  last_medication_taken: string | null;
  adherence_badge: "good" | "watch" | "missed" | "none";
  risk_level: "high" | "medium" | "low" | "none";
  risk_reason: string;
};

export type OrgDashboardStats = {
  totalPatients: number;
  callsLast7Days: number;
  adherencePercent: number | null;
  missedOrNoAnswer: number;
  emergencyCount: number;
  refillsNeededCount: number;
};

export type OrgDashboardResponse = {
  org: StoredOrg;
  patients: OrgPatientRow[];
  calls: CallLog[];
  stats: OrgDashboardStats;
};

export function adherenceBadgeClass(
  badge: OrgPatientRow["adherence_badge"],
): string {
  switch (badge) {
    case "good":
      return "border-warm-secondary/30 bg-warm-clinical-bg text-warm-secondary";
    case "watch":
      return "border-warm-saffron/40 bg-amber-50 text-amber-900";
    case "missed":
      return "border-warm-error/30 bg-warm-error-container/50 text-warm-error";
    default:
      return "border-warm-border-gentle bg-warm-linen text-warm-ink-muted";
  }
}

export function riskBadgeClass(
  level: OrgPatientRow["risk_level"],
): string {
  switch (level) {
    case "high":
      return "border-warm-error/40 bg-warm-error-container text-warm-error";
    case "medium":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "low":
      return "border-warm-secondary/30 bg-warm-clinical-bg text-warm-secondary";
    default:
      return "border-warm-border-gentle bg-warm-linen text-warm-ink-muted";
  }
}

export function formatRiskBadgeLabel(
  level: OrgPatientRow["risk_level"],
): string {
  switch (level) {
    case "high":
      return "🔴 High Risk";
    case "medium":
      return "🟡 Medium Risk";
    case "low":
      return "🟢 Low Risk";
    default:
      return "⚪ No Data";
  }
}

export function formatOrgBadgeLabel(
  badge: OrgPatientRow["adherence_badge"],
): string {
  switch (badge) {
    case "good":
      return "On track";
    case "watch":
      return "Check in";
    case "missed":
      return "Missed";
    default:
      return "No data";
  }
}
