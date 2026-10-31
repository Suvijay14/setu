"use client";

import { useCallback, useEffect, useState } from "react";
import type { Appointment } from "@/lib/appointments";
import { formatDashboardDateTime } from "@/lib/dashboardClient";
import { wp } from "@/lib/warmPortalClasses";

function statusPillClass(status: string | null): string {
  if (status === "confirmed") {
    return "border-warm-secondary/40 bg-warm-clinical-bg text-warm-secondary";
  }
  if (status === "cancelled") {
    return "border-warm-error/40 bg-warm-error-container/50 text-warm-error";
  }
  return "border-warm-saffron/40 bg-amber-50 text-amber-900";
}

function sourceBadge(source: string | null) {
  if (source === "escalation") {
    return (
      <span className="inline-flex rounded-full border border-warm-error/40 bg-warm-error-container/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warm-error">
        ⚠️ Escalation
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-warm-primary/30 bg-warm-linen px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warm-primary">
      📞 Inbound Call
    </span>
  );
}

export default function OrgAppointmentsTab({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/appointments");
    const body = (await response.json()) as {
      appointments?: Appointment[];
      error?: string;
      detail?: string;
    };
    if (!response.ok) {
      setError(body.detail ?? body.error ?? "Failed to load appointments");
      return;
    }
    const rows = body.appointments ?? [];
    setAppointments(rows);
    onCountChange?.(rows.length);
  }, [onCountChange]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadAppointments();
      setLoading(false);
    })();
  }, [loadAppointments]);

  const patchStatus = async (id: string, status: "confirmed" | "cancelled") => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Update failed");
        return;
      }
      setAppointments((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status } : row)),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <p className="px-4 py-10 text-center text-sm text-warm-ink-muted">
        Loading appointments…
      </p>
    );
  }

  if (error) {
    return (
      <p className={`px-4 py-10 text-center ${wp.error}`} role="alert">
        {error}
      </p>
    );
  }

  if (appointments.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-warm-ink-muted">
        No appointment requests yet. Inbound calls from +918064262082 will appear
        here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-warm-border-gentle bg-white">
      {appointments.map((row) => (
        <li key={row.id} className="px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-warm-ink">
                  {row.patient_name}
                </p>
                {sourceBadge(row.source)}
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPillClass(row.status)}`}
                >
                  {row.status ?? "pending"}
                </span>
              </div>
              <p className="text-sm text-warm-ink">
                <a
                  href={`tel:${row.phone.replace(/\s/g, "")}`}
                  className="font-medium text-warm-primary underline-offset-2 hover:underline"
                >
                  {row.phone}
                </a>
                {row.doctor ? (
                  <span className="text-warm-ink-muted"> · {row.doctor}</span>
                ) : null}
              </p>
              {row.symptoms ? (
                <p className="text-sm italic text-warm-ink-muted">{row.symptoms}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {row.preferred_time ? (
                  <span className="inline-flex rounded-full border border-warm-saffron/40 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                    {row.preferred_time}
                  </span>
                ) : null}
                <span className="text-xs text-warm-ink-muted">
                  {formatDashboardDateTime(row.created_at)}
                </span>
              </div>
            </div>
            {row.status === "pending" ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={updatingId === row.id}
                  onClick={() => void patchStatus(row.id, "confirmed")}
                  className={`${wp.btnPrimary} px-3 py-1.5 text-xs disabled:opacity-50`}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={updatingId === row.id}
                  onClick={() => void patchStatus(row.id, "cancelled")}
                  className={`${wp.btnSecondary} px-3 py-1.5 text-xs disabled:opacity-50`}
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
