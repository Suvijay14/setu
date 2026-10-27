"use client";

import { useCallback, useEffect, useState } from "react";
import type { CallLog } from "@/lib/types";
import { formatDashboardDateTime } from "@/lib/dashboardClient";
import type { DayAdherence } from "@/lib/patientAdherence";

export type OrgPatientDetail = {
  patient: {
    id: string;
    phone: string;
    name: string | null;
    location: string | null;
    medications: string | null;
    reminder_time: string | null;
    protocol: string | null;
    is_active: boolean;
  };
  calls: CallLog[];
  adherencePercent7d: number | null;
  adherenceByDay: DayAdherence[];
  nextScheduledCall: { label: string; reminder_time: string } | null;
};

function medicationClass(taken: string | null | undefined): string {
  if (taken === "yes") return "text-emerald-400";
  if (taken === "no") return "text-red-400";
  return "text-zinc-400";
}

function statusBadgeClass(status: string | null | undefined): string {
  if (!status) return "border-zinc-700 bg-zinc-800 text-zinc-400";
  const s = status.toLowerCase();
  if (s === "completed") {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  if (s === "no-answer" || s === "missed") {
    return "border-amber-600/30 bg-amber-900/20 text-amber-200/80";
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-200";
}

function dayBarClass(taken: DayAdherence["taken"]): string {
  if (taken === "yes") return "bg-emerald-500";
  if (taken === "no") return "bg-red-500";
  if (taken === "unclear") return "bg-zinc-500";
  return "bg-zinc-800";
}

function escalationText(call: CallLog): string | null {
  if (call.concern?.trim()) return call.concern.trim();
  if (call.emergency && call.summary?.trim()) return call.summary.trim();
  if (call.emergency) return "Emergency flagged on this call";
  return null;
}

type Props = {
  orgId: string;
  patientId: string;
  onClose: () => void;
  onInactive: () => void;
};

export default function OrgPatientModal({
  orgId,
  patientId,
  onClose,
  onInactive,
}: Props) {
  const [detail, setDetail] = useState<OrgPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingInactive, setMarkingInactive] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/org/patient/${encodeURIComponent(patientId)}?org_id=${encodeURIComponent(orgId)}`,
    );
    const body = (await response.json()) as OrgPatientDetail & { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Failed to load patient");
      setDetail(null);
      setLoading(false);
      return;
    }
    setDetail(body);
    setLoading(false);
  }, [orgId, patientId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleMarkInactive = async () => {
    setMarkingInactive(true);
    try {
      const response = await fetch(
        `/api/org/patient/${encodeURIComponent(patientId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org_id: orgId, is_active: false }),
        },
      );
      if (!response.ok) {
        setError("Could not mark patient inactive.");
        return;
      }
      onInactive();
      onClose();
    } finally {
      setMarkingInactive(false);
    }
  };

  const meds =
    detail?.patient.medications
      ?.split(/[,;\n]+/)
      .map((m) => m.trim())
      .filter(Boolean) ?? [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-patient-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-900/30 bg-[#0D111E] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#0E1322]/95 px-5 py-4 backdrop-blur-md">
          <h2
            id="org-patient-modal-title"
            className="text-lg font-semibold text-white"
          >
            Patient details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-5">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : detail ? (
            <>
              <div>
                <p className="text-xl font-semibold text-white">
                  {detail.patient.name ?? "Unnamed patient"}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {detail.patient.phone}
                  {detail.patient.location
                    ? ` · ${detail.patient.location}`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {detail.patient.protocol ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 capitalize text-amber-200">
                      {detail.patient.protocol}
                    </span>
                  ) : null}
                  {detail.patient.reminder_time ? (
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-zinc-300">
                      Daily call {detail.patient.reminder_time} IST
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Medications
                </h3>
                {meds.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc text-sm text-zinc-200">
                    {meds.map((med) => (
                      <li key={med}>{med}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">—</p>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#13192B] p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      7-day adherence
                    </h3>
                    <p className="mt-1 text-3xl font-semibold text-white">
                      {detail.adherencePercent7d !== null
                        ? `${detail.adherencePercent7d}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="flex h-16 items-end gap-1">
                    {detail.adherenceByDay.map((day) => (
                      <div
                        key={day.date}
                        className="flex w-6 flex-col items-center gap-1"
                        title={`${day.date}: ${day.taken}`}
                      >
                        <div
                          className={`w-full rounded-sm ${dayBarClass(day.taken)}`}
                          style={{
                            height:
                              day.taken === "none"
                                ? "8px"
                                : day.taken === "yes"
                                  ? "40px"
                                  : day.taken === "no"
                                    ? "24px"
                                    : "16px",
                          }}
                        />
                        <span className="text-[9px] text-zinc-500">
                          {day.date.slice(8)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {detail.nextScheduledCall ? (
                <p className="text-sm text-amber-200/90">
                  Next scheduled call:{" "}
                  <strong className="font-medium text-amber-300">
                    {detail.nextScheduledCall.label}
                  </strong>
                </p>
              ) : null}

              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Call history (last 5)
                </h3>
                {detail.calls.length === 0 ? (
                  <p className="text-sm text-zinc-500">No calls yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {detail.calls.map((call) => {
                      const escalation = escalationText(call);
                      return (
                        <li
                          key={call.id}
                          className="rounded-xl border border-white/10 bg-zinc-950/80 p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-zinc-300">
                              {formatDashboardDateTime(call.created_at)}
                              {call.duration != null
                                ? ` · ${call.duration}s`
                                : ""}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusBadgeClass(call.status)}`}
                            >
                              {call.status ?? "unknown"}
                            </span>
                          </div>
                          <p
                            className={`mt-2 capitalize ${medicationClass(call.medication_taken)}`}
                          >
                            Medication: {call.medication_taken ?? "unclear"}
                          </p>
                          {call.mood ? (
                            <p className="mt-1 capitalize text-zinc-400">
                              Mood: {call.mood}
                            </p>
                          ) : null}
                          {escalation ? (
                            <p className="mt-1 text-red-300/90">
                              Escalation: {escalation}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                type="button"
                disabled={markingInactive}
                onClick={() => void handleMarkInactive()}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {markingInactive ? "Updating…" : "Mark as inactive"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
