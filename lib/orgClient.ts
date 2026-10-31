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
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "watch":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "missed":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

export function riskBadgeClass(
  level: OrgPatientRow["risk_level"],
): string {
  switch (level) {
    case "high":
      return "bg-red-900 text-red-300 border-red-700";
    case "medium":
      return "bg-yellow-900 text-yellow-300 border-yellow-700";
    case "low":
      return "bg-green-900 text-green-300 border-green-700";
    default:
      return "bg-gray-800 text-gray-400 border-gray-700";
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
