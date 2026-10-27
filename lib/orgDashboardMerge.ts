import type { OrgDashboardResponse, OrgPatientRow } from "@/lib/orgClient";
import { computeOrgStats, enrichOrgPatients } from "@/lib/orgStats";
import { sortOrgDashboardCalls } from "@/lib/sortOrgCalls";
import type { CallLog, MedicationTaken, YesNo } from "@/lib/types";

function asMedicationTaken(value: unknown): MedicationTaken | null {
  if (value === "yes" || value === "no" || value === "unclear") {
    return value;
  }
  return null;
}

function asYesNo(value: unknown): YesNo | null {
  if (value === "yes" || value === "no") {
    return value;
  }
  return null;
}

/** Map a Realtime `postgres_changes` row to CallLog. */
export function callLogFromRealtimeRow(row: Record<string, unknown>): CallLog | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;

  return {
    id,
    call_id: typeof row.call_id === "string" ? row.call_id : "",
    patient_name: typeof row.patient_name === "string" ? row.patient_name : "",
    status: typeof row.status === "string" ? row.status : "",
    medication_taken: asMedicationTaken(row.medication_taken),
    action_required: asYesNo(row.action_required),
    concern: typeof row.concern === "string" ? row.concern : null,
    transcript: typeof row.transcript === "string" ? row.transcript : null,
    duration: typeof row.duration === "number" ? row.duration : null,
    mood: typeof row.mood === "string" ? row.mood : null,
    summary: typeof row.summary === "string" ? row.summary : null,
    emergency:
      typeof row.emergency === "boolean"
        ? row.emergency
        : row.emergency === null
          ? null
          : Boolean(row.emergency),
    escalation_flag:
      typeof row.escalation_flag === "boolean"
        ? row.escalation_flag
        : row.escalation_flag === null
          ? null
          : Boolean(row.escalation_flag),
    sms_sent:
      typeof row.sms_sent === "boolean"
        ? row.sms_sent
        : row.sms_sent === null
          ? null
          : Boolean(row.sms_sent),
    org_id: typeof row.org_id === "string" ? row.org_id : null,
    refill_needed:
      typeof row.refill_needed === "boolean"
        ? row.refill_needed
        : row.refill_needed === null
          ? null
          : Boolean(row.refill_needed),
    refill_medicine:
      typeof row.refill_medicine === "string" ? row.refill_medicine : null,
    agent_type: typeof row.agent_type === "string" ? row.agent_type : null,
    protocol: typeof row.protocol === "string" ? row.protocol : null,
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
  };
}

function patientSourcesFromRows(patients: OrgPatientRow[]) {
  return patients.map((p) => ({
    id: p.id,
    phone: p.phone,
    name: p.name,
    location: p.location,
    onboarded: p.onboarded,
    reminder_time: p.reminder_time,
  }));
}

function mergeCallLog(calls: CallLog[], incoming: CallLog): CallLog[] {
  if (calls.some((c) => c.id === incoming.id)) {
    return calls;
  }
  return [incoming, ...calls].slice(0, 200);
}

/** Apply a new call_logs INSERT to org dashboard state (stats + patient rows). */
export function applyOrgDashboardCallInsert(
  data: OrgDashboardResponse,
  incoming: CallLog,
): OrgDashboardResponse {
  if (incoming.org_id && incoming.org_id !== data.org.id) {
    return data;
  }

  const calls = sortOrgDashboardCalls(mergeCallLog(data.calls, incoming));
  const sources = patientSourcesFromRows(data.patients);

  return {
    ...data,
    calls,
    patients: enrichOrgPatients(sources, calls),
    stats: computeOrgStats(calls, data.patients.length),
  };
}
