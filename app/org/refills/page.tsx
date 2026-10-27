"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDashboardDateTime } from "@/lib/dashboardClient";
import { ORG_STORAGE_KEY, type StoredOrg } from "@/lib/orgClient";
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading refills…
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <p className="text-sm text-zinc-400">Sign in to your organization first.</p>
        <Link
          href="/org"
          className="mt-4 text-sm text-emerald-500 underline-offset-2 hover:underline"
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {org.name}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Refills (last 7 days)
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Patients who said medicine ran out on a Setu call
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/org"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              ← Dashboard
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              Setu home
            </Link>
          </div>
        </header>

        {error ? (
          <p className="mb-6 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-3xl font-semibold text-white">{total}</p>
          <p className="text-sm text-amber-100/90">
            patient{total === 1 ? "" : "s"} need refills
          </p>
          {data?.org.pharmacy_phone ? (
            <p className="mt-2 text-xs text-zinc-400">
              Preferred pharmacy on file — refill SMS sent automatically when
              detected on calls.
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              Add <code className="text-zinc-400">pharmacy_phone</code> on your
              organization row to auto-SMS the pharmacy on refill intent.
            </p>
          )}
        </div>

        {total === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            No refill requests in the last 7 days.
          </p>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="mb-3 text-sm font-semibold text-white">All patients</h2>
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
                  <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Patient</th>
                      <th className="px-4 py-3 font-medium">Medicine</th>
                      <th className="px-4 py-3 font-medium">Needed</th>
                      <th className="px-4 py-3 font-medium">Pharmacy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                    {entries.map((row) => (
                      <tr key={`${row.patient_name}-${row.needed_at}`}>
                        <td className="px-4 py-3 font-medium text-zinc-100">
                          {row.patient_name}
                          {row.phone ? (
                            <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                              {row.phone}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{row.medicine}</td>
                        <td className="px-4 py-3 text-zinc-400">
                          {formatDashboardDateTime(row.needed_at)}
                        </td>
                        <td className="px-4 py-3">
                          {row.pharmacy_link ? (
                            <a
                              href={row.pharmacy_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-500 underline-offset-2 hover:underline"
                            >
                              Maps →
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-white">
                Grouped by medicine
              </h2>
              <div className="space-y-4">
                {Object.entries(byMedicine).map(([medicine, rows]) => (
                  <div
                    key={medicine}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                  >
                    <h3 className="font-medium text-amber-200">{medicine}</h3>
                    <ul className="mt-2 space-y-2 text-sm text-zinc-400">
                      {rows.map((row) => (
                        <li key={`${medicine}-${row.patient_name}-${row.needed_at}`}>
                          <span className="text-zinc-200">{row.patient_name}</span>
                          {" · "}
                          {formatDashboardDateTime(row.needed_at)}
                          {row.pharmacy_link ? (
                            <>
                              {" · "}
                              <a
                                href={row.pharmacy_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-500 hover:underline"
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
