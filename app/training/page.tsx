"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrainingLog } from "@/lib/training";

function formatAnalysisDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ExpandableList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <details className="group rounded-lg border border-slate-200/80 bg-slate-50/80">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span className="text-xs font-normal text-slate-500">
            {items.length} item{items.length === 1 ? "" : "s"} · tap to expand
          </span>
        </span>
      </summary>
      {items.length === 0 ? (
        <p className="border-t border-slate-200/80 px-4 py-3 text-sm text-slate-500">
          {emptyLabel}
        </p>
      ) : (
        <ul className="list-disc space-y-2 border-t border-slate-200/80 px-4 py-3 pl-8 text-sm text-slate-700">
          {items.map((item, index) => (
            <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>
          ))}
        </ul>
      )}
    </details>
  );
}

export default function TrainingPipelinePage() {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoadError(null);
    const response = await fetch("/api/training/get-logs");
    const body = (await response.json()) as {
      logs?: TrainingLog[];
      error?: string;
      detail?: string;
    };

    if (!response.ok) {
      setLoadError(body.detail ?? body.error ?? "Failed to load logs");
      return;
    }

    setLogs(body.logs ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await fetchLogs();
      setLoading(false);
    })();
  }, [fetchLogs]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setAnalyzeMessage(null);
    try {
      const response = await fetch("/api/training/analyze-b2c-logs", {
        method: "POST",
      });
      const body = (await response.json()) as {
        success?: boolean;
        message?: string;
        calls?: number;
        calls_analyzed?: number;
        error?: string;
        detail?: string;
      };

      if (!response.ok) {
        setAnalyzeMessage(
          body.detail ?? body.error ?? "Analysis failed. Check server logs.",
        );
      } else if (body.message) {
        setAnalyzeMessage(`${body.message} (${body.calls ?? 0} calls).`);
      } else if (body.success) {
        setAnalyzeMessage(
          `Analysis complete — ${body.calls_analyzed ?? 0} calls in window.`,
        );
      }

      await fetchLogs();
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMarkApplied = async (id: string) => {
    setApplyingId(id);
    try {
      const response = await fetch("/api/training/mark-applied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = (await response.json()) as { error?: string; detail?: string };

      if (!response.ok) {
        setAnalyzeMessage(body.detail ?? body.error ?? "Could not mark as applied");
        return;
      }

      setLogs((prev) =>
        prev.map((log) =>
          log.id === id ? { ...log, applied_to_b2b: true } : log,
        ),
      );
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-on-surface">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-container">
            Internal · not linked
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            ML Training Pipeline — B2C → B2B Learning Loop
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Weekly analysis of family calls to improve hospital agent
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleRunAnalysis()}
              disabled={analyzing}
              className="rounded-lg bg-primary-container px-5 py-2.5 text-sm font-semibold text-surface-base transition hover:bg-saffron-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? "Running analysis…" : "Run Analysis Now"}
            </button>
            {analyzeMessage ? (
              <p className="text-sm text-text-warm">{analyzeMessage}</p>
            ) : null}
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-text-secondary">Loading training logs…</p>
        ) : loadError ? (
          <div className="rounded-xl border border-red-400/40 bg-white/95 p-4 text-sm text-red-800">
            {loadError}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-slate-200/20 bg-white p-6 text-sm text-slate-600 shadow-lg">
            No training runs yet. Use <strong>Run Analysis Now</strong> after you
            have at least 5 B2C calls in the last 7 days.
          </div>
        ) : (
          <ul className="space-y-5">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-slate-200/30 bg-white p-5 text-slate-900 shadow-lg"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {formatAnalysisDate(log.analysis_date)}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {log.calls_analyzed ?? 0} calls analyzed
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Escalation accuracy (Groq):{" "}
                      {log.findings.escalation_accuracy || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {log.applied_to_b2b ? (
                      <span className="inline-flex rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        Applied to B2B
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-primary-container/50 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                        Pending
                      </span>
                    )}
                    {!log.applied_to_b2b ? (
                      <button
                        type="button"
                        disabled={applyingId === log.id}
                        onClick={() => void handleMarkApplied(log.id)}
                        className="rounded-lg border border-surface-level-3 bg-surface-level-2 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-surface-level-3 disabled:opacity-50"
                      >
                        {applyingId === log.id
                          ? "Saving…"
                          : "Apply to B2B Canvas"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <ExpandableList
                    title="Confusion points"
                    items={log.findings.confusion_points}
                    emptyLabel="No confusion points recorded."
                  />
                  <ExpandableList
                    title="Recommendations for B2B"
                    items={log.findings.recommendations_for_b2b}
                    emptyLabel="No B2B recommendations yet."
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
