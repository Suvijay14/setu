"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CallLog } from "@/lib/types";
import {
  computeDashboardStats,
  FAMILY_PHONE_STORAGE_KEY,
  formatDashboardDateTime,
  normalizeFamilyPhone,
  rowHighlightClass,
  type DashboardApiSuccess,
  type DashboardPatient,
} from "@/lib/dashboardClient";

type ViewState =
  | { kind: "login" }
  | { kind: "loading" }
  | {
      kind: "dashboard";
      familyPhone: string;
      patient: DashboardPatient;
      calls: CallLog[];
    };

async function fetchDashboard(familyPhone: string): Promise<
  | { ok: true; data: DashboardApiSuccess }
  | { ok: false; notFound: boolean }
> {
  const response = await fetch(
    `/api/dashboard?family_phone=${encodeURIComponent(familyPhone)}`,
  );
  const body = (await response.json()) as Record<string, unknown>;

  if (
    response.status === 404 ||
    body.error === "not found"
  ) {
    return { ok: false, notFound: true };
  }
  if (!response.ok) {
    return { ok: false, notFound: false };
  }
  return { ok: true, data: body as unknown as DashboardApiSuccess };
}

export default function DashboardPage() {
  const [phoneInput, setPhoneInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  const openDashboard = useCallback(
    (familyPhone: string, data: DashboardApiSuccess) => {
      setView({
        kind: "dashboard",
        familyPhone,
        patient: data.patient,
        calls: data.calls,
      });
    },
    [],
  );

  const loadForPhone = useCallback(
    async (familyPhone: string) => {
      setView({ kind: "loading" });
      const result = await fetchDashboard(familyPhone);
      if (result.ok) {
        openDashboard(familyPhone, result.data);
        return;
      }
      if (result.notFound) {
        localStorage.removeItem(FAMILY_PHONE_STORAGE_KEY);
        setPhoneInput(familyPhone);
        setSubmitError(
          "No patient registered with this number. Please call Setu to register.",
        );
        setView({ kind: "login" });
        return;
      }
      setSubmitError("Something went wrong. Please try again.");
      setView({ kind: "login" });
    },
    [openDashboard],
  );

  useEffect(() => {
    const stored = localStorage.getItem(FAMILY_PHONE_STORAGE_KEY);
    if (stored) {
      void loadForPhone(stored);
    } else {
      setView({ kind: "login" });
    }
  }, [loadForPhone]);

  useEffect(() => {
    if (view.kind !== "dashboard") return;

    const intervalId = setInterval(() => {
      void fetchDashboard(view.familyPhone).then((result) => {
        if (result.ok) {
          openDashboard(view.familyPhone, result.data);
        }
      });
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [view, openDashboard]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const normalized = normalizeFamilyPhone(phoneInput);
    if (!normalized) {
      setSubmitError("Enter a valid number as +91XXXXXXXXXX");
      return;
    }

    const result = await fetchDashboard(normalized);
    if (result.ok) {
      localStorage.setItem(FAMILY_PHONE_STORAGE_KEY, normalized);
      openDashboard(normalized, result.data);
      return;
    }

    if (result.notFound) {
      setSubmitError(
        "No patient registered with this number. Please call Setu to register.",
      );
      return;
    }

    setSubmitError("Something went wrong. Please try again.");
  };

  const handleSignOut = () => {
    localStorage.removeItem(FAMILY_PHONE_STORAGE_KEY);
    setPhoneInput("");
    setSubmitError(null);
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
    const { callsToday, compliancePercent } = computeDashboardStats(
      view.calls,
    );
    const patientName = view.patient.name ?? "Your family";

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Setu Family Dashboard
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                {patientName} · {view.familyPhone} · refreshes every 30s
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

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Calls today
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {callsToday}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Medicine compliance
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {compliancePercent !== null ? `${compliancePercent}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Active patients
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {view.patient.onboarded ? 1 : 0}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
                <thead className="bg-zinc-900/90 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date / Time</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Medication</th>
                    <th className="px-4 py-3 font-medium">Mood</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 font-medium">Emergency</th>
                    <th className="px-4 py-3 font-medium">SMS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                  {view.calls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-zinc-500"
                      >
                        No call logs yet for this patient.
                      </td>
                    </tr>
                  ) : (
                    view.calls.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition-colors ${rowHighlightClass(row)}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                          {formatDashboardDateTime(row.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-100">
                            {row.patient_name ?? patientName}
                          </div>
                          {view.patient.location ? (
                            <div className="text-xs text-zinc-500">
                              {view.patient.location}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {row.status ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-zinc-300">
                          {row.medication_taken ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-zinc-300">
                          {row.mood ?? "—"}
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
                        <td className="px-4 py-3">
                          {row.sms_sent ? (
                            <span className="text-emerald-400">Sent</span>
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
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Enter your phone number to view your family&apos;s health updates
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Family phone
            </span>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+919910036896"
              autoComplete="tel"
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          {submitError ? (
            <p className="text-sm text-red-400" role="alert">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            View Dashboard
          </button>
        </form>

        <p className="mt-6 text-sm">
          <Link
            href="/setup"
            className="text-emerald-500 underline-offset-2 hover:text-emerald-400 hover:underline"
          >
            Register a new parent →
          </Link>
        </p>
      </div>
    </div>
  );
}
