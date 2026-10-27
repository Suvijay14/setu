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

function medicationBadgeClass(taken: string | null | undefined): string {
  if (taken === "yes") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (taken === "no") {
    return "border-red-500/40 bg-red-500/15 text-red-300";
  }
  return "border-zinc-600 bg-zinc-800 text-zinc-400";
}

function medicationLabel(taken: string | null | undefined): string {
  if (taken === "yes" || taken === "no" || taken === "unclear") {
    return taken;
  }
  return "unclear";
}

function statusBadgeClass(status: string | null | undefined): string {
  if (!status) {
    return "border-zinc-700 bg-zinc-800 text-zinc-400";
  }
  const s = status.toLowerCase();
  if (s === "completed") {
    return "border-primary-container/50 bg-primary-container/15 text-primary-container";
  }
  if (
    s === "no-answer" ||
    s === "no_answer" ||
    s === "missed" ||
    s === "busy" ||
    s === "failed"
  ) {
    return "border-amber-700/40 bg-amber-950/40 text-amber-200";
  }
  return "border-primary-container/30 bg-primary-container/10 text-amber-200";
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
  if (call.escalation_flag || call.emergency) {
    return "Emergency flagged on this call";
  }
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleMarkInactive = async () => {
    if (
      !window.confirm(
        "Mark this patient inactive? They will be hidden from the dashboard and will not receive scheduled calls.",
      )
    ) {
      return;
    }
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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-patient-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-surface-base shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-surface-base/95 px-5 py-4 backdrop-blur-md">
          <h2
            id="org-patient-modal-title"
            className="text-lg font-semibold text-white"
          >
            Patient details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
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
              <div className="rounded-xl border border-slate-800 bg-surface-level-1 p-4">
                <p className="text-xl font-semibold text-white">
                  {detail.patient.name ?? "Unnamed patient"}
                </p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Phone
                    </dt>
                    <dd className="text-zinc-200">{detail.patient.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Location
                    </dt>
                    <dd className="text-zinc-200">
                      {detail.patient.location ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Protocol
                    </dt>
                    <dd className="capitalize text-zinc-200">
                      {detail.patient.protocol ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Reminder time
                    </dt>
                    <dd className="text-zinc-200">
                      {detail.patient.reminder_time
                        ? `${detail.patient.reminder_time} IST daily`
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  {detail.patient.protocol ? (
                    <span className="rounded-full border border-primary-container/40 bg-primary-container/10 px-2.5 py-0.5 text-xs capitalize text-primary-container">
                      {detail.patient.protocol}
                    </span>
                  ) : null}
                  {detail.patient.reminder_time ? (
                    <span className="rounded-full border border-slate-700 bg-surface-level-2 px-2.5 py-0.5 text-xs text-zinc-300">
                      Calls at {detail.patient.reminder_time} IST
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Medications
                </h3>
                {meds.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {meds.map((med) => (
                      <li
                        key={med}
                        className="rounded-lg border border-slate-700 bg-surface-level-1 px-3 py-1.5 text-sm text-zinc-200"
                      >
                        {med}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">—</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-surface-level-1 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  7-day adherence
                </h3>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                  <p className="text-4xl font-semibold tabular-nums text-white">
                    {detail.adherencePercent7d !== null
                      ? `${detail.adherencePercent7d}%`
                      : "—"}
                  </p>
                  <div className="flex h-14 items-end gap-1">
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
                                ? "6px"
                                : day.taken === "yes"
                                  ? "36px"
                                  : day.taken === "no"
                                    ? "22px"
                                    : "14px",
                          }}
                        />
                        <span className="text-[9px] text-zinc-500">
                          {day.date.slice(8)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Yes responses ÷ calls in the last 7 days
                </p>
              </div>

              {detail.nextScheduledCall ? (
                <div className="rounded-lg border border-primary-container/25 bg-primary-container/5 px-4 py-3 text-sm">
                  <span className="text-zinc-400">Next scheduled call: </span>
                  <strong className="font-medium text-primary-container">
                    {detail.nextScheduledCall.label}
                  </strong>
                </div>
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
                          className="rounded-xl border border-slate-800 bg-zinc-950/80 p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-zinc-300">
                              {formatDashboardDateTime(call.created_at)}
                              {call.duration != null
                                ? ` · ${call.duration}s`
                                : ""}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${statusBadgeClass(call.status)}`}
                            >
                              {call.status?.replace(/_/g, " ") ?? "unknown"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-zinc-500">
                              Medication:
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs capitalize ${medicationBadgeClass(call.medication_taken)}`}
                            >
                              {medicationLabel(call.medication_taken)}
                            </span>
                          </div>
                          {call.mood ? (
                            <p className="mt-2 capitalize text-zinc-400">
                              Mood:{" "}
                              <span className="text-zinc-300">{call.mood}</span>
                            </p>
                          ) : null}
                          {escalation ? (
                            <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-red-200">
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
                disabled={markingInactive || !detail.patient.is_active}
                onClick={() => void handleMarkInactive()}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingInactive
                  ? "Updating…"
                  : detail.patient.is_active
                    ? "Mark as inactive"
                    : "Already inactive"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
