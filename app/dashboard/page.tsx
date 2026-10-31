"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clearSetuUserType } from "@/lib/setuSession";
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
import { wp } from "@/lib/warmPortalClasses";

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
  const router = useRouter();
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

  const handleBackToHome = () => {
    localStorage.removeItem(FAMILY_PHONE_STORAGE_KEY);
    clearSetuUserType();
    router.push("/");
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
      <div className={wp.loading}>Loading…</div>
    );
  }

  if (view.kind === "dashboard") {
    const { callsToday, compliancePercent } = computeDashboardStats(
      view.calls,
    );
    const patientName = view.patient.name ?? "Your family";

    return (
      <div className={wp.page}>
        <div className={wp.container}>
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className={wp.label}>Family care ledger</p>
              <h1 className={wp.h1}>Setu Family Dashboard</h1>
              <p className={`mt-1 ${wp.subtitle}`}>
                {patientName} · {view.familyPhone} · refreshes every 30s
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href="/org" className={wp.btnSecondary}>
                Clinic portal
              </Link>
              <button
                type="button"
                onClick={handleBackToHome}
                className={wp.btnSecondary}
              >
                Sign out / Back to Home
              </button>
            </div>
          </header>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className={wp.stat}>
              <p className={wp.label}>Calls today</p>
              <p className="mt-2 font-display text-3xl font-semibold text-warm-primary">
                {callsToday}
              </p>
            </div>
            <div className={wp.stat}>
              <p className={wp.label}>Medicine compliance</p>
              <p className="mt-2 font-display text-3xl font-semibold text-warm-secondary">
                {compliancePercent !== null ? `${compliancePercent}%` : "—"}
              </p>
            </div>
            <div className={wp.stat}>
              <p className={wp.label}>Active patients</p>
              <p className="mt-2 font-display text-3xl font-semibold text-warm-ink">
                {view.patient.onboarded ? 1 : 0}
              </p>
            </div>
          </div>

          <div className={wp.tableWrap}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className={wp.thead}>
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
                <tbody className={wp.tbody}>
                  {view.calls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-warm-ink-muted"
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
                        <td className="whitespace-nowrap px-4 py-3 text-warm-ink-muted">
                          {formatDashboardDateTime(row.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-warm-ink">
                            {row.patient_name ?? patientName}
                          </div>
                          {view.patient.location ? (
                            <div className="text-xs text-warm-ink-muted">
                              {view.patient.location}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-warm-ink">
                          {row.status ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-warm-ink">
                          {row.medication_taken ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-warm-ink">
                          {row.mood ?? "—"}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-warm-ink-muted">
                          {row.summary ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.emergency ? (
                            <span className="font-medium text-warm-error">
                              Yes
                            </span>
                          ) : (
                            <span className="text-warm-ink-muted">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.sms_sent ? (
                            <span className="text-warm-secondary">Sent</span>
                          ) : (
                            <span className="text-warm-ink-muted">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <section className={`mt-8 p-6 ${wp.card}`}>
            <h2 className="font-display text-lg font-semibold text-warm-ink">
              Send a message to {patientName}
            </h2>
            <form onSubmit={handleSendFamilyMessage} className="mt-4 space-y-4">
              <label className="block">
                <span className={wp.label}>
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
                  className={wp.input}
                />
              </label>

              {messageError ? (
                <p className={wp.error} role="alert">
                  {messageError}
                </p>
              ) : null}

              {messageSuccess ? (
                <p className={wp.success}>
                  Message will be delivered on the next call ✓
                </p>
              ) : null}

              <button
                type="submit"
                disabled={messageSending}
                className={wp.btnPrimary}
              >
                {messageSending ? "Sending…" : "Send Message"}
              </button>
            </form>
          </section>

          <section className={`mt-6 p-6 ${wp.card}`}>
            <h2 className="font-display text-lg font-semibold text-warm-ink">
              Parent Update Call
            </h2>
            <p className={`mt-2 ${wp.subtitle}`}>
              Setu will call you with a voice summary of your parent&apos;s day
            </p>
            <form
              onSubmit={handleSaveSummarySettings}
              className="mt-4 grid gap-4 sm:grid-cols-2"
            >
              <label className="block">
                <span className={wp.label}>Frequency</span>
                <select
                  value={summaryFrequency}
                  onChange={(e) => {
                    setSummaryFrequency(e.target.value);
                    setSummarySaveSuccess(false);
                    setSummarySaveError(null);
                  }}
                  className={wp.select}
                >
                  {SUMMARY_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={wp.label}>Time (IST)</span>
                <select
                  value={summaryTime}
                  onChange={(e) => {
                    setSummaryTime(e.target.value);
                    setSummarySaveSuccess(false);
                    setSummarySaveError(null);
                  }}
                  className={wp.select}
                >
                  {SUMMARY_TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>

              {summarySaveError ? (
                <p className={`${wp.error} sm:col-span-2`} role="alert">
                  {summarySaveError}
                </p>
              ) : null}

              {summarySaveSuccess ? (
                <p className={`${wp.success} sm:col-span-2`}>
                  Summary call settings saved ✓
                </p>
              ) : null}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={summarySaving}
                  className={wp.btnPrimary}
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
    <div className={wp.pageCenter}>
      <div className="w-full max-w-md text-center">
        <p className={wp.brand}>Setu | सेतु</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-warm-primary">
          Family portal
        </p>
        <p className={`mt-4 ${wp.subtitle}`}>
          Enter your phone number to view your family&apos;s health updates
        </p>

        <form
          onSubmit={handleSubmit}
          className={`mt-8 space-y-4 p-6 text-left ${wp.card}`}
        >
          <label className="block">
            <span className={wp.label}>Family phone</span>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+919910036896"
              autoComplete="tel"
              className={wp.input}
            />
          </label>

          {submitError ? (
            <p className={wp.error} role="alert">
              {submitError}
            </p>
          ) : null}

          <button type="submit" className={`w-full ${wp.btnPrimary}`}>
            View Dashboard
          </button>
        </form>

        <p className="mt-6 flex flex-col gap-2 text-sm">
          <Link href="/setup" className={wp.link}>
            Register a new parent →
          </Link>
          <button type="button" onClick={handleBackToHome} className={wp.linkMuted}>
            ← Sign out / Back to Home
          </button>
          <Link href="/org" className={wp.linkMuted}>
            Clinic / org portal →
          </Link>
        </p>
      </div>
    </div>
  );
}
