"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDashboardDateTime } from "@/lib/dashboardClient";
import { ORG_STORAGE_KEY, type StoredOrg } from "@/lib/orgClient";
import { wp } from "@/lib/warmPortalClasses";
import type { RefillPatientRow, RefillsByMedicine } from "@/lib/refills";

type RefillsResponse = {
  org: StoredOrg & { pharmacy_phone: string | null };
  totalPatients: number;
  entries: RefillPatientRow[];
  byMedicine: RefillsByMedicine;
};

export default function OrgRefillsPage() {
  const [org, setOrg] = useState<StoredOrg | null>(null);
  const [data, setData] = useState<RefillsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRefills = useCallback(async (orgId: string) => {
    setError(null);
    const response = await fetch(
      `/api/org/refills?org_id=${encodeURIComponent(orgId)}`,
    );
    const body = (await response.json()) as RefillsResponse & { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Failed to load refills");
      setData(null);
      return;
    }
    setData(body);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }
    try {
      const stored = JSON.parse(raw) as StoredOrg;
      if (!stored?.id) {
        setLoading(false);
        return;
      }
      setOrg(stored);
      void loadRefills(stored.id).finally(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, [loadRefills]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-paper text-warm-ink-muted">
        Loading refills…
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-warm-paper px-4 text-warm-ink">
        <p className="text-sm text-warm-ink-muted">Sign in to your organization first.</p>
        <Link
          href="/org"
          className="mt-4 text-sm text-warm-primary underline-offset-2 hover:underline"
        >
          Go to org login →
        </Link>
      </div>
    );
  }

  const total = data?.totalPatients ?? 0;
  const entries = data?.entries ?? [];
  const byMedicine = data?.byMedicine ?? {};

  return (
    <div className={wp.page}>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={wp.label}>{org.name}</p>
            <h1 className={wp.h1}>Refills (last 7 days)</h1>
            <p className="mt-1 text-sm text-warm-ink-muted">
              Patients who said medicine ran out on a Setu call
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/org"
              className="rounded-lg border border-warm-border-gentle bg-warm-linen px-4 py-2 text-sm font-medium text-warm-ink transition hover:bg-warm-linen"
            >
              ← Dashboard
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-warm-border-gentle bg-warm-linen px-4 py-2 text-sm font-medium text-warm-ink transition hover:bg-warm-linen"
            >
              Setu home
            </Link>
          </div>
        </header>

        {error ? (
          <p className="mb-6 text-sm text-warm-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mb-8 rounded-2xl border border-warm-saffron/40 bg-amber-50 p-5">
          <p className="font-display text-3xl font-semibold text-warm-primary">{total}</p>
          <p className="text-sm text-amber-900">
            patient{total === 1 ? "" : "s"} need refills
          </p>
          {data?.org.pharmacy_phone ? (
            <p className="mt-2 text-xs text-warm-ink-muted">
              Preferred pharmacy on file — refill SMS sent automatically when
              detected on calls.
            </p>
          ) : (
            <p className="mt-2 text-xs text-warm-ink-muted">
              Add <code className="text-warm-ink-muted">pharmacy_phone</code> on your
              organization row to auto-SMS the pharmacy on refill intent.
            </p>
          )}
        </div>

        {total === 0 ? (
          <p className="text-center text-sm text-warm-ink-muted">
            No refill requests in the last 7 days.
          </p>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="mb-3 text-sm font-semibold text-warm-ink">All patients</h2>
              <div className={wp.tableWrap}>
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-warm-linen/60 text-xs uppercase tracking-wide text-warm-ink-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Patient</th>
                      <th className="px-4 py-3 font-medium">Medicine</th>
                      <th className="px-4 py-3 font-medium">Needed</th>
                      <th className="px-4 py-3 font-medium">Pharmacy</th>
                    </tr>
                  </thead>
                  <tbody className={wp.tbody}>
                    {entries.map((row) => (
                      <tr key={`${row.patient_name}-${row.needed_at}`}>
                        <td className="px-4 py-3 font-medium text-warm-ink">
                          {row.patient_name}
                          {row.phone ? (
                            <span className="mt-0.5 block text-xs font-normal text-warm-ink-muted">
                              {row.phone}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-warm-ink-muted">{row.medicine}</td>
                        <td className="px-4 py-3 text-warm-ink-muted">
                          {formatDashboardDateTime(row.needed_at)}
                        </td>
                        <td className="px-4 py-3">
                          {row.pharmacy_link ? (
                            <a
                              href={row.pharmacy_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-warm-primary underline-offset-2 hover:underline"
                            >
                              Maps →
                            </a>
                          ) : (
                            <span className="text-xs text-warm-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-warm-ink">
                Grouped by medicine
              </h2>
              <div className="space-y-4">
                {Object.entries(byMedicine).map(([medicine, rows]) => (
                  <div
                    key={medicine}
                    className="rounded-xl border border-zinc-800 bg-warm-linen/50 p-4"
                  >
                    <h3 className="font-medium text-amber-200">{medicine}</h3>
                    <ul className="mt-2 space-y-2 text-sm text-warm-ink-muted">
                      {rows.map((row) => (
                        <li key={`${medicine}-${row.patient_name}-${row.needed_at}`}>
                          <span className="text-warm-ink">{row.patient_name}</span>
                          {" · "}
                          {formatDashboardDateTime(row.needed_at)}
                          {row.pharmacy_link ? (
                            <>
                              {" · "}
                              <a
                                href={row.pharmacy_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-warm-primary hover:underline"
                              >
                                pharmacy near patient
                              </a>
                            </>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
