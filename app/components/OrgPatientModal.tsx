"use client";

import { useCallback, useEffect, useState } from "react";
import type { CallLog } from "@/lib/types";
import { formatDashboardDateTime } from "@/lib/dashboardClient";
import { downloadPatientCallReport } from "@/lib/generatePatientPDF";
import type { DayAdherence } from "@/lib/patientAdherence";

export type OrgPatientDetail = {
  org: { name: string };
  patient: {
    id: string;
    phone: string;
    name: string | null;
    location: string | null;
    medications: string | null;
    reminder_time: string | null;
    protocol: string | null;
    is_active: boolean;
    created_at?: string | null;
  };
  calls: CallLog[];
  adherencePercent7d: number | null;
  adherenceByDay: DayAdherence[];
  nextScheduledCall: { label: string; reminder_time: string } | null;
};

function medicationBadgeClass(taken: string | null | undefined): string {
  if (taken === "yes") {
    return "border-emerald-500/40 bg-warm-secondary/15 text-warm-secondary";
  }
  if (taken === "no") {
    return "border-red-500/40 bg-red-500/15 text-red-300";
  }
  return "border-warm-border-gentle bg-warm-linen text-warm-ink-muted";
}

function medicationLabel(taken: string | null | undefined): string {
  if (taken === "yes" || taken === "no" || taken === "unclear") {
    return taken;
  }
  return "unclear";
}

function statusBadgeClass(status: string | null | undefined): string {
  if (!status) {
    return "border-warm-border-gentle bg-warm-linen text-warm-ink-muted";
  }
  const s = status.toLowerCase();
  if (s === "completed") {
    return "border-warm-primary/40 bg-warm-linen text-warm-primary";
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
  return "border-warm-saffron/40 bg-amber-50 text-amber-900";
}

function dayBarClass(taken: DayAdherence["taken"]): string {
  if (taken === "yes") return "bg-warm-secondary";
  if (taken === "no") return "bg-red-500";
  if (taken === "unclear") return "bg-zinc-500";
  return "bg-warm-linen";
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
    setDetail({
      ...body,
      org: body.org ?? { name: "Organization" },
    });
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

  const recentCalls = detail?.calls.slice(0, 5) ?? [];

  const handleDownloadReport = async () => {
    if (!detail) return;
    setDownloadingPdf(true);
    setError(null);
    try {
      const dischargeDate = detail.patient.created_at
        ? new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
          }).format(new Date(detail.patient.created_at))
        : null;

      await downloadPatientCallReport({
        orgName: detail.org.name,
        generatedAt: new Date(),
        patient: {
          name: detail.patient.name,
          phone: detail.patient.phone,
          age: null,
          condition: detail.patient.protocol,
          medications: detail.patient.medications,
          dischargeDate,
          doctor: null,
          nextScheduledCall: detail.nextScheduledCall?.label ?? null,
        },
        calls: detail.calls,
        adherencePercent7d: detail.adherencePercent7d,
        adherenceByDay: detail.adherenceByDay,
      });
    } catch {
      setError("Could not generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-patient-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-warm-border-gentle bg-warm-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-warm-border-gentle bg-warm-cream/95 px-5 py-4 backdrop-blur-md">
          <h2
            id="org-patient-modal-title"
            className="text-lg font-semibold text-warm-ink"
          >
            Patient details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-warm-border-gentle px-3 py-1.5 text-sm text-warm-ink-muted transition hover:bg-warm-linen"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-5">
          {loading ? (
            <p className="text-sm text-warm-ink-muted">Loading…</p>
          ) : error ? (
            <p className="text-sm text-warm-error">{error}</p>
          ) : detail ? (
            <>
              <div className="rounded-xl border border-warm-border-gentle bg-warm-linen p-4">
                <p className="text-xl font-semibold text-warm-ink">
                  {detail.patient.name ?? "Unnamed patient"}
                </p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-warm-ink-muted">
                      Phone
                    </dt>
                    <dd className="text-warm-ink">{detail.patient.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-warm-ink-muted">
                      Location
                    </dt>
                    <dd className="text-warm-ink">
                      {detail.patient.location ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-warm-ink-muted">
                      Protocol
                    </dt>
                    <dd className="capitalize text-warm-ink">
                      {detail.patient.protocol ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-warm-ink-muted">
                      Reminder time
                    </dt>
                    <dd className="text-warm-ink">
                      {detail.patient.reminder_time
                        ? `${detail.patient.reminder_time} IST daily`
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  {detail.patient.protocol ? (
                    <span className="rounded-full border border-warm-primary/30 bg-warm-linen px-2.5 py-0.5 text-xs capitalize text-warm-primary">
                      {detail.patient.protocol}
                    </span>
                  ) : null}
                  {detail.patient.reminder_time ? (
                    <span className="rounded-full border border-warm-border-gentle bg-warm-linen px-2.5 py-0.5 text-xs text-warm-ink-muted">
                      Calls at {detail.patient.reminder_time} IST
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-warm-ink-muted">
                  Medications
                </h3>
                {meds.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {meds.map((med) => (
                      <li
                        key={med}
                        className="rounded-lg border border-warm-border-gentle bg-warm-linen px-3 py-1.5 text-sm text-warm-ink"
                      >
                        {med}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-warm-ink-muted">—</p>
                )}
              </div>

              <div className="rounded-xl border border-warm-border-gentle bg-warm-linen p-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-warm-ink-muted">
                  7-day adherence
                </h3>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                  <p className="text-4xl font-semibold tabular-nums text-warm-ink">
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
                        <span className="text-[9px] text-warm-ink-muted">
                          {day.date.slice(8)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-warm-ink-muted">
                  Yes responses ÷ calls in the last 7 days
                </p>
              </div>

              {detail.nextScheduledCall ? (
                <div className="rounded-lg border border-warm-primary/20 bg-warm-linen/80 px-4 py-3 text-sm">
                  <span className="text-warm-ink-muted">Next scheduled call: </span>
                  <strong className="font-medium text-warm-primary">
                    {detail.nextScheduledCall.label}
                  </strong>
                </div>
              ) : null}

              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-warm-ink-muted">
                  Call history (last 5)
                </h3>
                {recentCalls.length === 0 ? (
                  <p className="text-sm text-warm-ink-muted">No calls yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {recentCalls.map((call) => {
                      const escalation = escalationText(call);
                      return (
                        <li
                          key={call.id}
                          className="rounded-xl border border-warm-border-gentle bg-warm-paper/80 p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-warm-ink-muted">
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
                            <span className="text-xs text-warm-ink-muted">
                              Medication:
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs capitalize ${medicationBadgeClass(call.medication_taken)}`}
                            >
                              {medicationLabel(call.medication_taken)}
                            </span>
                          </div>
                          {call.mood ? (
                            <p className="mt-2 capitalize text-warm-ink-muted">
                              Mood:{" "}
                              <span className="text-warm-ink-muted">{call.mood}</span>
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

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => void handleDownloadReport()}
                  className="flex-1 rounded-lg border border-white/80 bg-transparent px-4 py-2.5 text-sm font-medium text-warm-ink transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloadingPdf
                    ? "Generating PDF…"
                    : "Download Report (PDF)"}
                </button>
                <button
                  type="button"
                  disabled={markingInactive || !detail.patient.is_active}
                  onClick={() => void handleMarkInactive()}
                  className="flex-1 rounded-lg border border-warm-border-gentle bg-warm-linen px-4 py-2.5 text-sm font-medium text-warm-ink-muted transition hover:bg-warm-linen disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {markingInactive
                    ? "Updating…"
                    : detail.patient.is_active
                      ? "Mark as inactive"
                      : "Already inactive"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
