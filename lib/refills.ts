import type { CallLog } from "@/lib/types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type RefillPatientRow = {
  patient_id: string | null;
  patient_name: string;
  phone: string | null;
  medicine: string;
  needed_at: string;
  location: string | null;
  pharmacy_link: string | null;
};

export type RefillsByMedicine = Record<string, RefillPatientRow[]>;

export function buildPharmacyMapsLink(location: string | null): string | null {
  if (!location?.trim()) return null;
  const query = encodeURIComponent(`pharmacy near ${location.trim()}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function recentRefillCalls(calls: CallLog[]): CallLog[] {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  return calls.filter(
    (c) => c.refill_needed === true && c.created_at >= cutoff,
  );
}

/** Unique patients with a refill signal in the last 7 days (latest call per patient name). */
export function latestRefillEntries(
  calls: CallLog[],
  patientByName: Map<
    string,
    { id: string; phone: string; location: string | null }
  >,
): RefillPatientRow[] {
  const refillCalls = recentRefillCalls(calls);
  const latestByPatient = new Map<string, CallLog>();

  for (const call of refillCalls) {
    const name = call.patient_name?.trim();
    if (!name) continue;
    const existing = latestByPatient.get(name);
    if (!existing || call.created_at > existing.created_at) {
      latestByPatient.set(name, call);
    }
  }

  const rows: RefillPatientRow[] = [];
  for (const [patient_name, call] of Array.from(latestByPatient.entries())) {
    const patient = patientByName.get(patient_name);
    const medicine =
      call.refill_medicine?.trim() || "Medicine not specified";
    const location = patient?.location ?? null;
    rows.push({
      patient_id: patient?.id ?? null,
      patient_name,
      phone: patient?.phone ?? null,
      medicine,
      needed_at: call.created_at,
      location,
      pharmacy_link: buildPharmacyMapsLink(location),
    });
  }

  rows.sort(
    (a, b) =>
      new Date(b.needed_at).getTime() - new Date(a.needed_at).getTime(),
  );
  return rows;
}

export function countRefillsNeeded(calls: CallLog[]): number {
  const refillCalls = recentRefillCalls(calls);
  const names = new Set<string>();
  for (const call of refillCalls) {
    const name = call.patient_name?.trim();
    if (name) names.add(name);
  }
  return names.size;
}

export function groupRefillsByMedicine(
  entries: RefillPatientRow[],
): RefillsByMedicine {
  const grouped: RefillsByMedicine = {};
  for (const entry of entries) {
    const key = entry.medicine;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key]!.sort(
      (a, b) =>
        new Date(b.needed_at).getTime() - new Date(a.needed_at).getTime(),
    );
  }
  return grouped;
}

export function patientNameMap(
  patients: Array<{
    id: string;
    name: string | null;
    phone: string;
    location: string | null;
  }>,
): Map<string, { id: string; phone: string; location: string | null }> {
  const map = new Map<
    string,
    { id: string; phone: string; location: string | null }
  >();
  for (const p of patients) {
    const name = p.name?.trim();
    if (!name) continue;
    map.set(name, { id: p.id, phone: p.phone, location: p.location });
  }
  return map;
}
