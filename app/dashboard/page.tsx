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

const SUMMARY_TIME_OPTIONS = [
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
] as const;

const SUMMARY_FREQUENCY_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Every 2 days", value: "every2days" },
  { label: "Weekly", value: "weekly" },
  { label: "Never", value: "never" },
] as const;

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
  const [familyMessage, setFamilyMessage] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [summaryFrequency, setSummaryFrequency] = useState("daily");
  const [summaryTime, setSummaryTime] = useState("20:00");
  const [summarySaving, setSummarySaving] = useState(false);
  const [summarySaveError, setSummarySaveError] = useState<string | null>(null);
  const [summarySaveSuccess, setSummarySaveSuccess] = useState(false);

  const openDashboard = useCallback(
    (familyPhone: string, data: DashboardApiSuccess) => {
      setSummaryFrequency(data.patient.child_summary_frequency ?? "daily");
      setSummaryTime(data.patient.child_summary_time ?? "20:00");
      setSummarySaveSuccess(false);
      setSummarySaveError(null);
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
    setFamilyMessage("");
    setMessageSuccess(false);
    setMessageError(null);
    setView({ kind: "login" });
  };

  const handleSaveSummarySettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (view.kind !== "dashboard") return;

    setSummarySaving(true);
    setSummarySaveError(null);
    setSummarySaveSuccess(false);

    try {
      const response = await fetch("/api/update-summary-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_phone: view.familyPhone,
          frequency: summaryFrequency,
          time: summaryTime,
        }),
      });
      const body = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !body.success) {
        setSummarySaveError(body.error ?? "Failed to save settings.");
        return;
      }

      setSummarySaveSuccess(true);
      setView({
        ...view,
        patient: {
          ...view.patient,
          child_summary_frequency: summaryFrequency,
          child_summary_time: summaryTime,
        },
      });
    } catch {
      setSummarySaveError("Failed to save settings.");
    } finally {
      setSummarySaving(false);
    }
  };

  const handleSendFamilyMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (view.kind !== "dashboard") return;

    const trimmed = familyMessage.trim();
    if (!trimmed) {
      setMessageError("Enter a message to send.");
      setMessageSuccess(false);
      return;
    }

    setMessageSending(true);
    setMessageError(null);
    setMessageSuccess(false);

    try {
      const response = await fetch("/api/family-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_phone: view.familyPhone,
          message: trimmed,
        }),
      });
      const body = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setMessageError(body.error ?? "Failed to send message.");
        return;
      }

      setFamilyMessage("");
      setMessageSuccess(true);
    } catch {
      setMessageError("Failed to send message.");
    } finally {
      setMessageSending(false);
    }
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

          <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h2 className="text-lg font-semibold text-white">
              Send a message to {patientName}
            </h2>
            <form onSubmit={handleSendFamilyMessage} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Type a message for Setu to deliver on the next call
                </span>
                <input
                  type="text"
                  value={familyMessage}
                  onChange={(e) => {
                    setFamilyMessage(e.target.value);
                    setMessageSuccess(false);
                    setMessageError(null);
                  }}
                  placeholder="Beta, kal doctor ke paas jana hai"
                  disabled={messageSending}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-60"
                />
              </label>

              {messageError ? (
                <p className="text-sm text-red-400" role="alert">
                  {messageError}
                </p>
              ) : null}

              {messageSuccess ? (
                <p className="text-sm text-emerald-400">
                  Message will be delivered on the next call ✓
                </p>
              ) : null}

              <button
                type="submit"
                disabled={messageSending}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {messageSending ? "Sending…" : "Send Message"}
              </button>
            </form>
          </section>

          <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h2 className="text-lg font-semibold text-white">
              Parent Update Call
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Setu will call you with a voice summary of your parent&apos;s day
            </p>
            <form
              onSubmit={handleSaveSummarySettings}
              className="mt-4 grid gap-4 sm:grid-cols-2"
            >
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Frequency
                </span>
                <select
                  value={summaryFrequency}
                  onChange={(e) => {
                    setSummaryFrequency(e.target.value);
                    setSummarySaveSuccess(false);
                    setSummarySaveError(null);
                  }}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  {SUMMARY_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Time (IST)
                </span>
                <select
                  value={summaryTime}
                  onChange={(e) => {
                    setSummaryTime(e.target.value);
                    setSummarySaveSuccess(false);
                    setSummarySaveError(null);
                  }}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  {SUMMARY_TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>

              {summarySaveError ? (
                <p className="text-sm text-red-400 sm:col-span-2" role="alert">
                  {summarySaveError}
                </p>
              ) : null}

              {summarySaveSuccess ? (
                <p className="text-sm text-emerald-400 sm:col-span-2">
                  Summary call settings saved ✓
                </p>
              ) : null}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={summarySaving}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {summarySaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </section>
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
