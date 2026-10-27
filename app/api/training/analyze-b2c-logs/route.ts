import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GROQ_MODEL = "qwen/qwen3.8-27b";
const MIN_CALLS = 5;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
/** Groq on-demand ITPM for qwen3.8-27b is ~7k tokens; keep prompt + transcripts under ~5k chars. */
const MAX_CALLS_FOR_GROQ = 12;
const MAX_TRANSCRIPT_CHARS_PER_CALL = 1200;
const MAX_COMBINED_TRANSCRIPT_CHARS = 4800;

const ANALYSIS_PROMPT = `You are analyzing healthcare AI call transcripts.
Find: (1) confusion points (2) medication name variants patients use 
(3) regional Hindi words (4) escalation false positives 
(5) what greetings worked best
Return JSON: { confusion_points: [], medication_variants: {}, 
regional_words: [], escalation_accuracy: '0%', 
best_greetings: [], recommendations_for_b2b: [] }`;

export type TrainingFindings = {
  confusion_points: string[];
  medication_variants: Record<string, string[]>;
  regional_words: string[];
  escalation_accuracy: string;
  best_greetings: string[];
  recommendations_for_b2b: string[];
};

type CallLogRow = {
  transcript: string | null;
  agent_type?: string | null;
  protocol?: string | null;
  org_id?: string | null;
  patient_name?: string | null;
  created_at?: string | null;
};

type GroqAnalysisResult =
  | { ok: true; findings: TrainingFindings }
  | { ok: false; reason: string; detail?: string; httpStatus?: number };

type PatientProtocolRow = {
  name: string;
  protocol: string | null;
  org_id: string | null;
};

function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42703" ||
    (error.message?.includes("does not exist") ?? false)
  );
}

function parseGroqFindings(content: string): TrainingFindings | null {
  const jsonText = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  const slice =
    start >= 0 && end > start ? jsonText.slice(start, end + 1) : jsonText;

  try {
    return JSON.parse(slice) as TrainingFindings;
  } catch {
    return null;
  }
}

function truncateTranscript(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}… [truncated]`;
}

function buildTranscriptBundle(calls: CallLogRow[]): {
  text: string;
  callsIncluded: number;
  totalCallsAvailable: number;
} {
  const sorted = [...calls].sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  const selected = sorted.slice(0, MAX_CALLS_FOR_GROQ);
  const parts: string[] = [];
  let charBudget = MAX_COMBINED_TRANSCRIPT_CHARS;

  for (let index = 0; index < selected.length; index += 1) {
    const raw = selected[index].transcript?.trim();
    if (!raw) continue;

    const perCallLimit = Math.min(
      MAX_TRANSCRIPT_CHARS_PER_CALL,
      charBudget - 80,
    );
    if (perCallLimit < 200) break;

    const snippet = truncateTranscript(raw, perCallLimit);
    parts.push(`--- Call ${index + 1} ---\n${snippet}`);
    charBudget -= snippet.length + 40;
    if (charBudget <= 0) break;
  }

  return {
    text: parts.join("\n\n"),
    callsIncluded: parts.length,
    totalCallsAvailable: calls.length,
  };
}

function isB2cProtocol(protocol: string | null | undefined): boolean {
  const p = protocol?.toLowerCase();
  return p === "reminder" || p === "eldercare";
}

function isB2cCall(
  row: CallLogRow,
  patientByName: Map<string, PatientProtocolRow>,
): boolean {
  if (row.agent_type === "b2c") return true;
  if (isB2cProtocol(row.protocol)) return true;
  if (row.org_id) return false;

  const nameKey = row.patient_name?.trim().toLowerCase();
  if (nameKey) {
    const patient = patientByName.get(nameKey);
    if (patient) {
      if (patient.org_id) return false;
      if (isB2cProtocol(patient.protocol)) return true;
      return true;
    }
  }

  return row.org_id == null;
}

async function loadPatientProtocolByName(): Promise<Map<string, PatientProtocolRow>> {
  const { data, error } = await supabase
    .from("patients")
    .select("name, protocol, org_id");

  if (error) {
    console.warn("analyze-b2c-logs patients lookup failed:", error.message);
    return new Map();
  }

  const map = new Map<string, PatientProtocolRow>();
  for (const row of data ?? []) {
    const name = typeof row.name === "string" ? row.name.trim().toLowerCase() : "";
    if (!name) continue;
    map.set(name, {
      name: row.name,
      protocol: typeof row.protocol === "string" ? row.protocol : null,
      org_id: typeof row.org_id === "string" ? row.org_id : null,
    });
  }
  return map;
}

async function fetchRecentCallLogs(cutoff: string): Promise<{
  rows: CallLogRow[] | null;
  error: { message: string; code?: string } | null;
}> {
  const withAgentColumns = await supabase
    .from("call_logs")
    .select("transcript, agent_type, protocol, org_id, patient_name, created_at")
    .gte("created_at", cutoff)
    .not("transcript", "is", null);

  if (!withAgentColumns.error) {
    return { rows: (withAgentColumns.data ?? []) as CallLogRow[], error: null };
  }

  if (!isMissingColumnError(withAgentColumns.error)) {
    return { rows: null, error: withAgentColumns.error };
  }

  console.warn(
    "analyze-b2c-logs: call_logs.agent_type/protocol missing; using org_id + patients fallback",
  );

  const legacy = await supabase
    .from("call_logs")
    .select("transcript, org_id, patient_name, created_at")
    .gte("created_at", cutoff)
    .not("transcript", "is", null);

  if (legacy.error) {
    return { rows: null, error: legacy.error };
  }

  return { rows: (legacy.data ?? []) as CallLogRow[], error: null };
}

async function analyzeWithGroq(transcripts: string): Promise<GroqAnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("analyze-b2c-logs: missing GROQ_API_KEY");
    return {
      ok: false,
      reason: "Groq API key not configured",
      detail: "Set GROQ_API_KEY in Vercel project environment variables.",
    };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: `${ANALYSIS_PROMPT}\n\n--- TRANSCRIPTS ---\n${transcripts}`,
        },
      ],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("analyze-b2c-logs Groq failed:", response.status, errText);
    let detail = errText.slice(0, 500);
    try {
      const parsed = JSON.parse(errText) as {
        error?: { message?: string };
      };
      detail = parsed.error?.message ?? detail;
    } catch {
      /* use raw slice */
    }
    return {
      ok: false,
      reason: "Groq API request failed",
      detail,
      httpStatus: response.status,
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return {
      ok: false,
      reason: "Groq returned an empty response",
    };
  }

  const findings = parseGroqFindings(content);
  if (!findings) {
    return {
      ok: false,
      reason: "Could not parse Groq JSON output",
      detail: content.slice(0, 300),
    };
  }

  return { ok: true, findings };
}

async function runB2cLogAnalysis() {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const { rows, error } = await fetchRecentCallLogs(cutoff);

  if (error) {
    console.error("analyze-b2c-logs fetch failed:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch call logs",
        detail: error.message,
        hint: "If detail mentions agent_type, run scripts/migrations/add-training-call-log-columns.sql in Supabase.",
      },
      { status: 500 },
    );
  }

  const patientByName = await loadPatientProtocolByName();

  const b2cCalls = (rows ?? []).filter((row) =>
    isB2cCall(row, patientByName),
  );

  const callsWithTranscript = b2cCalls.filter(
    (row) => row.transcript && row.transcript.trim().length > 0,
  );

  if (callsWithTranscript.length < MIN_CALLS) {
    return NextResponse.json({
      message: "Not enough data yet",
      calls: callsWithTranscript.length,
    });
  }

  const bundle = buildTranscriptBundle(callsWithTranscript);
  if (bundle.callsIncluded < MIN_CALLS) {
    return NextResponse.json({
      message: "Not enough transcript text to analyze",
      calls: bundle.callsIncluded,
    });
  }

  const groq = await analyzeWithGroq(bundle.text);
  if (!groq.ok) {
    return NextResponse.json(
      {
        error: "Failed to analyze transcripts with Groq",
        detail: groq.detail ?? groq.reason,
        model: GROQ_MODEL,
        hint: "Model is set in the API, not in curl. Ensure GROQ_API_KEY is on Vercel.",
      },
      { status: groq.httpStatus === 401 ? 503 : 502 },
    );
  }

  const callsAnalyzed = callsWithTranscript.length;
  const findings = groq.findings;

  const { error: insertError } = await supabase.from("training_logs").insert({
    calls_analyzed: callsAnalyzed,
    findings,
    applied_to_b2b: false,
  });

  if (insertError) {
    console.error("analyze-b2c-logs training_logs insert failed:", insertError);
    return NextResponse.json(
      { error: "Analysis complete but failed to save training_logs" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    calls_analyzed: callsAnalyzed,
    calls_sent_to_groq: bundle.callsIncluded,
    total_calls_in_window: bundle.totalCallsAvailable,
    model: GROQ_MODEL,
    findings,
  });
}

/** Vercel Cron invokes GET; manual runs use POST. */
export async function GET() {
  return runB2cLogAnalysis();
}

export async function POST() {
  return runB2cLogAnalysis();
}
