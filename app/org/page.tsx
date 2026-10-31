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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
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
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        {selectedPatientId ? (
          <OrgPatientModal
            orgId={org.id}
            patientId={selectedPatientId}
            onClose={() => setSelectedPatientId(null)}
            onInactive={() => void refreshDashboard(org)}
          />
        ) : null}
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {org.type}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {org.name}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                <span>Organization dashboard</span>
                {liveConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">
                    · refreshes every 30s
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Family dashboard
              </Link>
              <button
                type="button"
                onClick={handleBackToHome}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Sign out / Back to Home
              </button>
            </div>
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

          <section className="mb-8 rounded-xl border border-amber-500/25 bg-zinc-900/60 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Refills</h2>
                <p className="mt-1 text-2xl font-semibold text-amber-200">
                  {stats.refillsNeededCount} patient
                  {stats.refillsNeededCount === 1 ? "" : "s"} need refills
                </p>
                <p className="mt-1 text-xs text-zinc-500">Last 7 days · from voice calls</p>
              </div>
              <Link
                href="/org/refills"
                className="shrink-0 rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-500"
              >
                View all refills →
              </Link>
            </div>
            {refillPreview.length > 0 ? (
              <ul className="mt-4 divide-y divide-zinc-800/80 rounded-lg border border-zinc-800 bg-zinc-950/80 text-sm">
                {refillPreview.map((row) => (
                  <li
                    key={`${row.patient_name}-${row.needed_at}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                  >
                    <span className="font-medium text-zinc-200">
                      {row.patient_name}
                    </span>
                    <span className="text-zinc-400">{row.medicine}</span>
                    <span className="text-xs text-zinc-500">
                      {formatDashboardDateTime(row.needed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                No refill requests detected yet.
              </p>
            )}
          </section>

          <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-white">Upload Patients</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Import up to 1,000 patients from CSV. They will be onboarded under{" "}
              {org.name}.
            </p>
            <p className="mt-3">
              <a
                href="/patients_template.csv"
                download="patients_template.csv"
                className="text-xs text-emerald-500 underline-offset-2 hover:text-emerald-400 hover:underline"
              >
                Download CSV template
              </a>
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
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
                  className="mt-2 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-zinc-700"
                />
              </label>
              <button
                type="button"
                disabled={!csvFile || uploading}
                onClick={() => void handleCsvUpload()}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Upload and Onboard
              </button>
            </div>
            {uploadProgressLabel ? (
              <p className="mt-3 text-sm text-amber-300">{uploadProgressLabel}</p>
            ) : null}
            {uploadSuccessMessage ? (
              <p className="mt-3 text-sm text-emerald-400">{uploadSuccessMessage}</p>
            ) : null}
            {uploadApiError ? (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {uploadApiError}
              </p>
            ) : null}
            {uploadErrors.length > 0 ? (
              <details className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                <summary className="cursor-pointer text-xs font-medium text-zinc-300">
                  {uploadErrors.length} import error
                  {uploadErrors.length === 1 ? "" : "s"} (click to expand)
                </summary>
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-zinc-400">
                  {uploadErrors.map((err, index) => (
                    <li key={`${err.row}-${index}`}>
                      {err.row > 0 ? (
                        <span className="text-zinc-500">Row {err.row}: </span>
                      ) : null}
                      {err.reason}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>

          <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
            <button
              type="button"
              onClick={() => setOrgTab("patients")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                orgTab === "patients"
                  ? "bg-zinc-100 text-zinc-950"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              Patients
            </button>
            <button
              type="button"
              onClick={() => setOrgTab("appointments")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                orgTab === "appointments"
                  ? "bg-zinc-100 text-zinc-950"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              Appointments ({appointmentCount})
            </button>
          </div>

          {orgTab === "appointments" ? (
            <div className="mb-8 overflow-hidden rounded-xl border border-zinc-800">
              <div className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
                <h2 className="text-sm font-semibold text-white">
                  Appointment requests
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Inbound line + escalation follow-ups
                </p>
              </div>
              <OrgAppointmentsTab onCountChange={setAppointmentCount} />
            </div>
          ) : null}

          {orgTab === "patients" ? (
          <>
          <div className="mb-8 overflow-hidden rounded-xl border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Patients</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Click a row for full history, adherence, and medications
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
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
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-200 focus:border-primary-container focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="high">High Risk Only</option>
                    <option value="attention">Needs Attention</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
                <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Last call</th>
                    <th className="px-4 py-3 font-medium">Adherence</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                  {patients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-zinc-500"
                      >
                        No patients linked to this organization yet.
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-zinc-500"
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
                        className="cursor-pointer transition hover:bg-zinc-900/60 focus:bg-zinc-900/60 focus:outline-none focus:ring-1 focus:ring-primary-container/50"
                        onClick={() => setSelectedPatientId(row.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedPatientId(row.id);
                          }
                        }}
                      >
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
                    <th className="px-4 py-3 font-medium">Escalation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                  {sortedCalls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-zinc-500"
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
                          {isCallEscalation(row) ? (
                            <span className="inline-flex rounded-full border border-red-500/50 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-300">
                              Escalation
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
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

        <div className="mt-6 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-4 py-3 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-500/90">
            Demo access code
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-emerald-300">
            {DEMO_ORG_ACCESS_CODE}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {DEMO_ORG_NAME} · for judges and buildathon walkthroughs
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4 text-left">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Organization access code
            </span>
            <input
              type="password"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder={DEMO_ORG_ACCESS_CODE}
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
          <button
            type="button"
            onClick={handleBackToHome}
            className="text-emerald-500 underline-offset-2 hover:text-emerald-400 hover:underline"
          >
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
          Loading…
        </div>
      }
    >
      <OrgDashboardPageInner />
    </Suspense>
  );
}
