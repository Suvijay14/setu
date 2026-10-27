import type { CallLog } from "@/lib/types";

export const ORG_STORAGE_KEY = "setu_org";

export type StoredOrg = {
  id: string;
  name: string;
  type: string;
};

export type OrgPatientRow = {
  phone: string;
  name: string | null;
  location: string | null;
  onboarded: boolean;
  reminder_time: string | null;
  last_call_status: string | null;
  last_medication_taken: string | null;
  adherence_badge: "good" | "watch" | "missed" | "none";
};

export type OrgDashboardStats = {
  totalPatients: number;
  callsLast7Days: number;
  adherencePercent: number | null;
  missedOrNoAnswer: number;
  emergencyCount: number;
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
