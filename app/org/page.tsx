"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clearSetuUserType } from "@/lib/setuSession";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { CallLog } from "@/lib/types";
import {
  formatDashboardDateTime,
  isCallEscalation,
  rowHighlightClass,
} from "@/lib/dashboardClient";
import { sortOrgDashboardCalls } from "@/lib/sortOrgCalls";
import OrgAppointmentsTab from "@/app/components/OrgAppointmentsTab";
import OrgPatientModal from "@/app/components/OrgPatientModal";
import { countCsvPatientDataRows } from "@/lib/csvPatients";
import {
  DEMO_ORG_ACCESS_CODE,
  DEMO_ORG_NAME,
  ORG_STORAGE_KEY,
  adherenceBadgeClass,
  formatOrgBadgeLabel,
  formatRiskBadgeLabel,
  riskBadgeClass,
  type OrgDashboardResponse,
  type OrgPatientRow,
  type StoredOrg,
} from "@/lib/orgClient";
import {
  applyOrgDashboardCallInsert,
  callLogFromRealtimeRow,
} from "@/lib/orgDashboardMerge";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { latestRefillEntries, patientNameMap } from "@/lib/refills";
import { wp } from "@/lib/warmPortalClasses";

type UploadError = { row: number; reason: string };

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

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
  | { ok: false; notFound: boolean; message?: string }
> {
  const response = await fetch(
    `/api/org/dashboard?org_id=${encodeURIComponent(orgId)}`,
  );
  const body = (await response.json()) as Record<string, unknown>;

  if (response.status === 404) {
    return { ok: false, notFound: true };
  }
  if (!response.ok) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : typeof body.error === "string"
          ? body.error
          : undefined;
    return { ok: false, notFound: false, message: detail };
  }
  return { ok: true, data: body as unknown as OrgDashboardResponse };
}

function OrgDashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [codeInput, setCodeInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressLabel, setUploadProgressLabel] = useState<string | null>(
    null,
  );
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<
    string | null
  >(null);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [uploadApiError, setUploadApiError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [liveConnected, setLiveConnected] = useState(false);
  const [orgTab, setOrgTab] = useState<"patients" | "appointments">("patients");
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "attention">(
    "all",
  );

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
      setLoginError(
        result.message ??
          "Dashboard could not load. Run: alter table patients add column if not exists is_active boolean default true;",
      );
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
    const patientId = searchParams.get("patient_id")?.trim();
    if (patientId && view.kind === "dashboard") {
      setSelectedPatientId(patientId);
    }
  }, [searchParams, view.kind]);

  const dashboardOrgId = view.kind === "dashboard" ? view.org.id : null;

  useEffect(() => {
    if (!dashboardOrgId) return;
    void fetch("/api/appointments")
      .then((response) => response.json())
      .then((body: { appointments?: unknown[] }) => {
        setAppointmentCount(body.appointments?.length ?? 0);
      })
      .catch(() => setAppointmentCount(0));
  }, [dashboardOrgId]);

  const sortedCalls = useMemo(() => {
    if (view.kind !== "dashboard") return [];
    return sortOrgDashboardCalls(view.calls);
  }, [view]);

  useEffect(() => {
    if (!dashboardOrgId) {
      setLiveConnected(false);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setLiveConnected(false);
      return;
    }

    const channel = supabase
      .channel(`org_${dashboardOrgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_logs",
          filter: `org_id=eq.${dashboardOrgId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const log = callLogFromRealtimeRow(row);
          if (!log) return;

          setView((prev) => {
            if (prev.kind !== "dashboard" || prev.org.id !== dashboardOrgId) {
              return prev;
            }
            const merged = applyOrgDashboardCallInsert(
              {
                org: prev.org,
                patients: prev.patients,
                calls: prev.calls,
                stats: prev.stats,
              },
              log,
            );
            return {
              kind: "dashboard",
              org: merged.org,
              patients: merged.patients,
              calls: merged.calls,
              stats: merged.stats,
            };
          });
        },
      )
      .subscribe((status) => {
        setLiveConnected(status === "SUBSCRIBED");
      });

    return () => {
      setLiveConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [dashboardOrgId]);

  useEffect(() => {
    if (view.kind !== "dashboard") return;
    if (liveConnected) return;

    const intervalId = setInterval(() => {
      void fetchOrgDashboard(view.org.id).then((result) => {
        if (result.ok) {
          openDashboard(result.data);
        }
      });
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [view, openDashboard, liveConnected]);

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
      setLoginError(
        body.error === "Invalid code"
          ? `Invalid code. Try demo code ${DEMO_ORG_ACCESS_CODE} or your clinic code in Supabase.`
          : (body.error ?? "Invalid code"),
      );
      return;
    }

    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(body.org));
    await loadOrg(body.org);
  };

  const refreshDashboard = useCallback(
    async (org: StoredOrg) => {
      const result = await fetchOrgDashboard(org.id);
      if (result.ok) {
        openDashboard(result.data);
      }
    },
    [openDashboard],
  );

  const handleBackToHome = () => {
    localStorage.removeItem(ORG_STORAGE_KEY);
    clearSetuUserType();
    setCodeInput("");
    setLoginError(null);
    setCsvFile(null);
    setUploadSuccessMessage(null);
    setUploadErrors([]);
    setUploadApiError(null);
    router.push("/");
  };

  const handleCsvUpload = async () => {
    if (view.kind !== "dashboard" || !csvFile) return;

    setUploadApiError(null);
    setUploadSuccessMessage(null);
    setUploadErrors([]);

    let rowCount = 0;
    try {
      const text = await csvFile.text();
      rowCount = countCsvPatientDataRows(text);
    } catch {
      setUploadApiError("Could not read CSV file.");
      return;
    }

    if (rowCount === 0) {
      setUploadApiError("CSV has no patient rows.");
      return;
    }

    setUploading(true);
    setUploadProgressLabel(`Uploading ${rowCount} patients...`);

    try {
      const csv_file_base64 = await readFileAsBase64(csvFile);
      const response = await fetch("/api/org/upload-patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: view.org.id,
          csv_file_base64,
        }),
      });

      const body = (await response.json()) as {
        success?: number;
        errors?: UploadError[];
        error?: string;
      };

      if (!response.ok) {
        setUploadApiError(body.error ?? "Upload failed.");
        if (body.errors?.length) {
          setUploadErrors(body.errors);
        }
        return;
      }

      const successCount = body.success ?? 0;
      setUploadErrors(body.errors ?? []);

      if (successCount > 0) {
        setUploadSuccessMessage(
          `${successCount} patients added. Setu will call them at their reminder times.`,
        );
        setCsvFile(null);
        await refreshDashboard(view.org);
      } else {
        setUploadApiError("No patients were imported. Fix the errors below.");
      }
    } catch {
      setUploadApiError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgressLabel(null);
    }
  };

  if (view.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-cream text-warm-ink-muted">
        Loading…
      </div>
    );
  }

  if (view.kind === "dashboard") {
    const { org, patients, calls, stats } = view;
    const refillEntries = latestRefillEntries(
      calls,
      patientNameMap(
        patients.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          location: p.location,
        })),
      ),
    );
    const refillPreview = refillEntries.slice(0, 5);

    const filteredPatients = patients.filter((row) => {
      if (riskFilter === "high") return row.risk_level === "high";
      if (riskFilter === "attention") {
        return row.risk_level === "high" || row.risk_level === "medium";
      }
      return true;
    });

    return (
      <div className={wp.page}>
        {selectedPatientId ? (
          <OrgPatientModal
            orgId={org.id}
            patientId={selectedPatientId}
            onClose={() => setSelectedPatientId(null)}
            onInactive={() => void refreshDashboard(org)}
          />
        ) : null}
        <div className={wp.container}>
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className={wp.label}>{org.type}</p>
              <h1 className={wp.h1}>{org.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-warm-ink-muted">
                <span>Organization dashboard</span>
                {liveConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warm-secondary/40 bg-warm-clinical-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warm-secondary">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warm-secondary" />
                    Live
                  </span>
                ) : (
                  <span className="text-xs text-warm-ink-muted">
                    · refreshes every 30s
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href="/dashboard" className={wp.btnSecondary}>
                Family dashboard
              </Link>
              <button type="button" onClick={handleBackToHome} className={wp.btnSecondary}>
                Sign out / Back to Home
              </button>
            </div>
          </header>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={wp.stat}>
              <p className={wp.label}>Patients</p>
              <p className="mt-2 font-display text-3xl font-semibold text-warm-primary">
                {stats.totalPatients}
              </p>
            </div>
            <div className={wp.stat}>
              <p className={wp.label}>7-day adherence</p>
              <p className="mt-2 font-display text-3xl font-semibold text-warm-secondary">
                {stats.adherencePercent !== null
                  ? `${stats.adherencePercent}%`
                  : "—"}
              </p>
            </div>
            <div className={wp.stat}>
              <p className={wp.label}>Missed / no answer</p>
              <p className="mt-2 font-display text-3xl font-semibold text-warm-ink">
                {stats.missedOrNoAnswer}
              </p>
            </div>
            <div className={wp.stat}>
              <p className={wp.label}>Emergencies (7d)</p>
              <p className="mt-2 font-display text-3xl font-semibold text-warm-error">
                {stats.emergencyCount}
              </p>
            </div>
          </div>

          <section className="mb-8 rounded-xl border border-amber-500/25 bg-warm-linen/90 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-warm-ink">Refills</h2>
                <p className="mt-1 font-display text-2xl font-semibold text-warm-primary">
                  {stats.refillsNeededCount} patient
                  {stats.refillsNeededCount === 1 ? "" : "s"} need refills
                </p>
                <p className="mt-1 text-xs text-warm-ink-muted">Last 7 days · from voice calls</p>
              </div>
              <Link
                href="/org/refills"
                className="shrink-0 rounded-xl bg-warm-saffron px-4 py-2 text-sm font-semibold text-warm-ink transition hover:brightness-105"
              >
                View all refills →
              </Link>
            </div>
            {refillPreview.length > 0 ? (
              <ul className="mt-4 divide-y divide-warm-border-gentle/80 rounded-lg border border-warm-border-gentle bg-warm-paper text-sm">
                {refillPreview.map((row) => (
                  <li
                    key={`${row.patient_name}-${row.needed_at}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                  >
                    <span className="font-medium text-warm-ink">
                      {row.patient_name}
                    </span>
                    <span className="text-warm-ink-muted">{row.medicine}</span>
                    <span className="text-xs text-warm-ink-muted">
                      {formatDashboardDateTime(row.needed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-warm-ink-muted">
                No refill requests detected yet.
              </p>
            )}
          </section>

          <section className="mb-8 rounded-xl border border-warm-border-gentle bg-white p-5">
            <h2 className="text-sm font-semibold text-warm-ink">Upload Patients</h2>
            <p className="mt-1 text-xs text-warm-ink-muted">
              Import up to 1,000 patients from CSV. They will be onboarded under{" "}
              {org.name}.
            </p>
            <p className="mt-3">
              <a
                href="/patients_template.csv"
                download="patients_template.csv"
                className="text-xs text-warm-primary underline-offset-2 hover:text-warm-primary-container hover:underline"
              >
                Download CSV template
              </a>
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1">
                <span className="text-xs font-medium uppercase tracking-wide text-warm-ink-muted">
                  CSV file
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCsvFile(file);
                    setUploadSuccessMessage(null);
                    setUploadErrors([]);
                    setUploadApiError(null);
                  }}
                  className="mt-2 block w-full text-sm text-warm-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-warm-linen file:px-3 file:py-2 file:text-sm file:font-medium file:text-warm-ink hover:file:bg-warm-container-high"
                />
              </label>
              <button
                type="button"
                disabled={!csvFile || uploading}
                onClick={() => void handleCsvUpload()}
                className={`${wp.btnPrimary} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Upload and Onboard
              </button>
            </div>
            {uploadProgressLabel ? (
              <p className="mt-3 text-sm text-amber-300">{uploadProgressLabel}</p>
            ) : null}
            {uploadSuccessMessage ? (
              <p className="mt-3 text-sm text-warm-secondary">{uploadSuccessMessage}</p>
            ) : null}
            {uploadApiError ? (
              <p className="mt-3 text-sm text-warm-error" role="alert">
                {uploadApiError}
              </p>
            ) : null}
            {uploadErrors.length > 0 ? (
              <details className="mt-4 rounded-lg border border-warm-border-gentle bg-warm-paper p-3">
                <summary className="cursor-pointer text-xs font-medium text-warm-ink-muted">
                  {uploadErrors.length} import error
                  {uploadErrors.length === 1 ? "" : "s"} (click to expand)
                </summary>
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-warm-ink-muted">
                  {uploadErrors.map((err, index) => (
                    <li key={`${err.row}-${index}`}>
                      {err.row > 0 ? (
                        <span className="text-warm-ink-muted">Row {err.row}: </span>
                      ) : null}
                      {err.reason}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>

          <div className="mb-4 flex flex-wrap gap-2 border-b border-warm-border-gentle pb-3">
            <button
              type="button"
              onClick={() => setOrgTab("patients")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                orgTab === "patients"
                  ? "bg-warm-primary text-white"
                  : "bg-warm-linen text-warm-ink-muted hover:bg-warm-container-high hover:text-warm-ink"
              }`}
            >
              Patients
            </button>
            <button
              type="button"
              onClick={() => setOrgTab("appointments")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                orgTab === "appointments"
                  ? "bg-warm-primary text-white"
                  : "bg-warm-linen text-warm-ink-muted hover:bg-warm-container-high hover:text-warm-ink"
              }`}
            >
              Appointments ({appointmentCount})
            </button>
          </div>

          {orgTab === "appointments" ? (
            <div className="mb-8 overflow-hidden rounded-xl border border-warm-border-gentle">
              <div className="border-b border-warm-border-gentle bg-warm-linen px-4 py-3">
                <h2 className="text-sm font-semibold text-warm-ink">
                  Appointment requests
                </h2>
                <p className="mt-0.5 text-xs text-warm-ink-muted">
                  Inbound line + escalation follow-ups
                </p>
              </div>
              <OrgAppointmentsTab onCountChange={setAppointmentCount} />
            </div>
          ) : null}

          {orgTab === "patients" ? (
          <>
          <div className="mb-8 overflow-hidden rounded-xl border border-warm-border-gentle">
            <div className="border-b border-warm-border-gentle bg-warm-linen px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-warm-ink">Patients</h2>
                  <p className="mt-0.5 text-xs text-warm-ink-muted">
                    Click a row for full history, adherence, and medications
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-warm-ink-muted">
                  <span className="shrink-0 font-medium uppercase tracking-wide">
                    Show
                  </span>
                  <select
                    value={riskFilter}
                    onChange={(e) =>
                      setRiskFilter(
                        e.target.value as "all" | "high" | "attention",
                      )
                    }
                    className="rounded-lg border border-warm-border-gentle bg-warm-paper px-2.5 py-1.5 text-sm text-warm-ink focus:border-primary-container focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="high">High Risk Only</option>
                    <option value="attention">Needs Attention</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-warm-border-gentle text-left text-sm">
                <thead className="bg-warm-linen/90 text-xs uppercase tracking-wide text-warm-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Last call</th>
                    <th className="px-4 py-3 font-medium">Adherence</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-border-gentle/80 bg-warm-paper">
                  {patients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-warm-ink-muted"
                      >
                        No patients linked to this organization yet.
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-warm-ink-muted"
                      >
                        No patients match this risk filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((row) => (
                      <tr
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer transition hover:bg-warm-linen/90 focus:bg-warm-linen/90 focus:outline-none focus:ring-1 focus:ring-primary-container/50"
                        onClick={() => setSelectedPatientId(row.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedPatientId(row.id);
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-warm-ink">
                            {row.name ?? "—"}
                          </div>
                          {row.location ? (
                            <div className="text-xs text-warm-ink-muted">
                              {row.location}
                            </div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-warm-ink-muted">
                          {row.phone}
                        </td>
                        <td className="px-4 py-3 capitalize text-warm-ink-muted">
                          {row.last_call_status ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${adherenceBadgeClass(row.adherence_badge)}`}
                          >
                            {formatOrgBadgeLabel(row.adherence_badge)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            title={row.risk_reason}
                            className={`inline-flex cursor-help rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskBadgeClass(row.risk_level)}`}
                          >
                            {formatRiskBadgeLabel(row.risk_level)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-warm-border-gentle">
            <div className="border-b border-warm-border-gentle bg-warm-linen px-4 py-3">
              <h2 className="text-sm font-semibold text-warm-ink">
                Recent calls ({stats.callsLast7Days} in last 7 days)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-warm-border-gentle text-left text-sm">
                <thead className="bg-warm-linen text-xs uppercase tracking-wide text-warm-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date / Time</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Medication</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 font-medium">Escalation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-border-gentle/80 bg-warm-paper">
                  {sortedCalls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-warm-ink-muted"
                      >
                        No call logs for this organization yet.
                      </td>
                    </tr>
                  ) : (
                    sortedCalls.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition-colors ${rowHighlightClass(row)}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-warm-ink-muted">
                          {formatDashboardDateTime(row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-warm-ink">
                          {row.patient_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-warm-ink-muted">
                          {row.status ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-warm-ink-muted">
                          {row.medication_taken ?? "—"}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-warm-ink-muted">
                          {row.summary ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {isCallEscalation(row) ? (
                            <span className="inline-flex rounded-full border border-red-500/50 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-300">
                              Escalation
                            </span>
                          ) : (
                            <span className="text-warm-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={wp.pageCenter}>
      <div className="w-full max-w-md text-center">
        <p className={wp.brand}>Setu | सेतु</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-warm-primary">
          Organization portal
        </p>
        <p className={`mt-4 ${wp.subtitle}`}>
          Enter your clinic or partner access code to view enrolled patients and
          call activity.
        </p>

        <div className={`mt-6 ${wp.demoBox}`}>
          <p className={wp.label}>Demo access code</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-warm-primary">
            {DEMO_ORG_ACCESS_CODE}
          </p>
          <p className="mt-1 text-xs text-warm-ink-muted">
            {DEMO_ORG_NAME} · for judges and buildathon walkthroughs
          </p>
        </div>

        <form onSubmit={handleLogin} className={`mt-8 space-y-4 p-6 text-left ${wp.card}`}>
          <label className="block">
            <span className={wp.label}>Organization access code</span>
            <input
              type="password"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder={DEMO_ORG_ACCESS_CODE}
              autoComplete="off"
              className={wp.input}
            />
          </label>

          {loginError ? (
            <p className={wp.error} role="alert">
              {loginError}
            </p>
          ) : null}

          <button type="submit" className={`w-full ${wp.btnPrimary}`}>
            Enter dashboard
          </button>
        </form>

        <p className="mt-6 text-sm">
          <button type="button" onClick={handleBackToHome} className={wp.link}>
            ← Sign out / Back to Home
          </button>
        </p>
      </div>
    </div>
  );
}

export default function OrgDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-warm-cream text-warm-ink-muted">
          Loading…
        </div>
      }
    >
      <OrgDashboardPageInner />
    </Suspense>
  );
}
