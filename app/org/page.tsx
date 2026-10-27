"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CallLog } from "@/lib/types";
import { formatDashboardDateTime, rowHighlightClass } from "@/lib/dashboardClient";
import {
  ORG_STORAGE_KEY,
  adherenceBadgeClass,
  formatOrgBadgeLabel,
  type OrgDashboardResponse,
  type OrgPatientRow,
  type StoredOrg,
} from "@/lib/orgClient";

type ViewState =
  | { kind: "login" }
  | { kind: "loading" }
  | {
      kind: "dashboard";
      org: StoredOrg;
      patients: OrgPatientRow[];
      calls: CallLog[];
      stats: OrgDashboardResponse["stats"];
    };

async function fetchOrgDashboard(
  orgId: string,
): Promise<
  | { ok: true; data: OrgDashboardResponse }
  | { ok: false; notFound: boolean }
> {
  const response = await fetch(
    `/api/org/dashboard?org_id=${encodeURIComponent(orgId)}`,
  );
  const body = (await response.json()) as Record<string, unknown>;

  if (response.status === 404) {
    return { ok: false, notFound: true };
  }
  if (!response.ok) {
    return { ok: false, notFound: false };
  }
  return { ok: true, data: body as unknown as OrgDashboardResponse };
}

export default function OrgDashboardPage() {
  const [codeInput, setCodeInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  const openDashboard = useCallback((data: OrgDashboardResponse) => {
    setView({
      kind: "dashboard",
      org: data.org,
      patients: data.patients,
      calls: data.calls,
      stats: data.stats,
    });
  }, []);

  const loadOrg = useCallback(
    async (org: StoredOrg) => {
      setView({ kind: "loading" });
      const result = await fetchOrgDashboard(org.id);
      if (result.ok) {
        localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(result.data.org));
        openDashboard(result.data);
        return;
      }
      if (result.notFound) {
        localStorage.removeItem(ORG_STORAGE_KEY);
        setLoginError("Organization not found. Enter your access code again.");
        setView({ kind: "login" });
        return;
      }
      setLoginError("Something went wrong. Please try again.");
      setView({ kind: "login" });
    },
    [openDashboard],
  );

  useEffect(() => {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) {
      setView({ kind: "login" });
      return;
    }
    try {
      const org = JSON.parse(raw) as StoredOrg;
      if (org?.id) {
        void loadOrg(org);
      } else {
        setView({ kind: "login" });
      }
    } catch {
      localStorage.removeItem(ORG_STORAGE_KEY);
      setView({ kind: "login" });
    }
  }, [loadOrg]);

  useEffect(() => {
    if (view.kind !== "dashboard") return;

    const intervalId = setInterval(() => {
      void fetchOrgDashboard(view.org.id).then((result) => {
        if (result.ok) {
          openDashboard(result.data);
        }
      });
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [view, openDashboard]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);

    const access_code = codeInput.trim();
    if (!access_code) {
      setLoginError("Enter your organization access code.");
      return;
    }

    const response = await fetch("/api/org/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_code }),
    });
    const body = (await response.json()) as {
      org?: StoredOrg;
      error?: string;
    };

    if (!response.ok || !body.org) {
      setLoginError(body.error ?? "Invalid code");
      return;
    }

    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(body.org));
    await loadOrg(body.org);
  };

  const handleSignOut = () => {
    localStorage.removeItem(ORG_STORAGE_KEY);
    setCodeInput("");
    setLoginError(null);
    setView({ kind: "login" });
  };

  if (view.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading…
      </div>
    );
  }

  if (view.kind === "dashboard") {
    const { org, patients, calls, stats } = view;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {org.type}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {org.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Organization dashboard · refreshes every 30s
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              Sign out
            </button>
          </header>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Patients
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {stats.totalPatients}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                7-day adherence
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {stats.adherencePercent !== null
                  ? `${stats.adherencePercent}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Missed / no answer
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {stats.missedOrNoAnswer}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Emergencies (7d)
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {stats.emergencyCount}
              </p>
            </div>
          </div>

          <div className="mb-8 overflow-hidden rounded-xl border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Patients</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
                <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Last call</th>
                    <th className="px-4 py-3 font-medium">Adherence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                  {patients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-zinc-500"
                      >
                        No patients linked to this organization yet.
                      </td>
                    </tr>
                  ) : (
                    patients.map((row) => (
                      <tr key={row.phone}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-100">
                            {row.name ?? "—"}
                          </div>
                          {row.location ? (
                            <div className="text-xs text-zinc-500">
                              {row.location}
                            </div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                          {row.phone}
                        </td>
                        <td className="px-4 py-3 capitalize text-zinc-300">
                          {row.last_call_status ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${adherenceBadgeClass(row.adherence_badge)}`}
                          >
                            {formatOrgBadgeLabel(row.adherence_badge)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Recent calls ({stats.callsLast7Days} in last 7 days)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
                <thead className="bg-zinc-900/90 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date / Time</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Medication</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 font-medium">Emergency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                  {calls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-zinc-500"
                      >
                        No call logs for this organization yet.
                      </td>
                    </tr>
                  ) : (
                    calls.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition-colors ${rowHighlightClass(row)}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                          {formatDashboardDateTime(row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-zinc-100">
                          {row.patient_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-zinc-300">
                          {row.status ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-zinc-300">
                          {row.medication_taken ?? "—"}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-zinc-400">
                          {row.summary ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.emergency ? (
                            <span className="font-medium text-red-400">
                              Yes
                            </span>
                          ) : (
                            <span className="text-zinc-500">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-md text-center">
        <p className="text-3xl font-semibold tracking-tight text-white">
          Setu
        </p>
        <p className="mt-2 text-sm text-zinc-400">Organization portal</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Enter your clinic or partner access code to view enrolled patients and
          call activity.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4 text-left">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Organization access code
            </span>
            <input
              type="password"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Access code"
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          {loginError ? (
            <p className="text-sm text-red-400" role="alert">
              {loginError}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Enter dashboard
          </button>
        </form>

        <p className="mt-6 text-sm">
          <Link
            href="/"
            className="text-emerald-500 underline-offset-2 hover:text-emerald-400 hover:underline"
          >
            ← Back to Setu home
          </Link>
        </p>
      </div>
    </div>
  );
}
