import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GROQ_MODEL = "qwen/qwen3.8-27b";
const MIN_CALLS = 5;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
};

function parseGroqFindings(content: string): TrainingFindings | null {
  const jsonText = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(jsonText) as TrainingFindings;
  } catch {
    return null;
  }
}

function isB2cCall(row: CallLogRow): boolean {
  if (row.agent_type === "b2c") return true;
  const protocol = row.protocol?.toLowerCase();
  return protocol === "reminder" || protocol === "eldercare";
}

async function analyzeWithGroq(transcripts: string): Promise<TrainingFindings | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("analyze-b2c-logs: missing GROQ_API_KEY");
    return null;
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
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("analyze-b2c-logs Groq failed:", response.status, errText);
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  return parseGroqFindings(content);
}

export async function POST() {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const { data: rows, error } = await supabase
    .from("call_logs")
    .select("transcript, agent_type, protocol, created_at")
    .gte("created_at", cutoff)
    .not("transcript", "is", null);

  if (error) {
    console.error("analyze-b2c-logs fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch call logs" },
      { status: 500 },
    );
  }

  const b2cCalls = (rows ?? []).filter((row) =>
    isB2cCall(row as CallLogRow),
  ) as CallLogRow[];

  const callsWithTranscript = b2cCalls.filter(
    (row) => row.transcript && row.transcript.trim().length > 0,
  );

  if (callsWithTranscript.length < MIN_CALLS) {
    return NextResponse.json({
      message: "Not enough data yet",
      calls: callsWithTranscript.length,
    });
  }

  const combinedTranscripts = callsWithTranscript
    .map((row, index) => `--- Call ${index + 1} ---\n${row.transcript!.trim()}`)
    .join("\n\n");

  const findings = await analyzeWithGroq(combinedTranscripts);
  if (!findings) {
    return NextResponse.json(
      { error: "Failed to analyze transcripts with Groq" },
      { status: 502 },
    );
  }

  const callsAnalyzed = callsWithTranscript.length;

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
    findings,
  });
}
