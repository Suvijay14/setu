import { supabase } from "@/lib/supabase";
import type { CallLog } from "@/lib/types";
import type { Patient } from "@/lib/patient";

const BOLNA_CALL_URL = "https://api.bolna.dev/call";

export type SummaryFrequency = "daily" | "every2days" | "weekly" | "never";

export function getCurrentTimeIST(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function parseTimeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isSummaryTimeWindowDue(summaryTime: string, now = new Date()): boolean {
  const scheduled = parseTimeToMinutes(summaryTime);
  const current = parseTimeToMinutes(getCurrentTimeIST(now));
  if (scheduled === null || current === null) return false;

  // Vercel Hobby allows daily crons only (see vercel.json: 16:45 UTC ≈ 22:15 IST).
  // Batch run: include anyone whose IST summary time has already passed today.
  return scheduled <= current;
}

function getIstDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isSummaryFrequencyDue(
  frequency: SummaryFrequency,
  lastSentAt: string | null,
  now = new Date(),
): boolean {
  if (!lastSentAt) return true;

  const last = new Date(lastSentAt);
  const ms = now.getTime() - last.getTime();
  const days = ms / (1000 * 60 * 60 * 24);

  switch (frequency) {
    case "daily":
      return getIstDateKey(last) !== getIstDateKey(now);
    case "every2days":
      return days >= 2;
    case "weekly":
      return days >= 7;
    default:
      return false;
  }
}

export function getLogLookbackIso(
  frequency: SummaryFrequency,
  now = new Date(),
): string {
  const hours =
    frequency === "weekly" ? 24 * 7 : frequency === "every2days" ? 48 : 24;
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

export function buildRawSummaryFromLogs(
  patient: Patient,
  logs: CallLog[],
): string {
  const medsTaken = logs.filter((l) => l.medication_taken === "yes").length;
  const medsMissed = logs.filter((l) => l.medication_taken === "no").length;
  const moods = logs.map((l) => l.mood).filter(Boolean);
  const concerns = logs.map((l) => l.concern).filter(Boolean);
  const emergencies = logs.filter((l) => l.emergency).length;
  const summaries = logs.map((l) => l.summary).filter(Boolean);

  return JSON.stringify({
    patient_name: patient.name,
    medications: patient.medications,
    call_count: logs.length,
    medicines_taken_count: medsTaken,
    medicines_missed_count: medsMissed,
    moods,
    concerns,
    emergency_alerts: emergencies,
    call_summaries: summaries,
  });
}

export async function generateHindiSummaryParagraph(
  rawData: string,
  patientName: string,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return `Aaj ${patientName} ji ke calls ka summary tayyar nahi ho paya.`;
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          {
            role: "user",
            content: `Turn this JSON about an elderly parent's recent Setu phone calls into ONE natural Hindi paragraph for their adult child.

Data: ${rawData}

Format like:
"Aaj [patient_name] ji ne [medications] li. Unka mood [mood] tha. [concern if any]. Koi emergency nahi thi."

Mention emergencies clearly if emergency_alerts > 0.
Keep under 80 words. Hindi only. No JSON.`,
          },
        ],
        max_tokens: 200,
      }),
    },
  );

  if (!response.ok) {
    console.error("Groq summary call failed:", response.status);
    return `Aaj ${patientName} ji ke health updates available hain. Dashboard par dekhein.`;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (
    data.choices?.[0]?.message?.content?.trim() ||
    `Aaj ${patientName} ji ke liye koi naya update nahi hai.`
  );
}

export async function fireSummaryBolnaCall(
  apiKey: string,
  agentId: string,
  familyPhone: string,
  patientName: string,
  summaryText: string,
): Promise<boolean> {
  const response = await fetch(BOLNA_CALL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: agentId,
      recipient_phone_number: familyPhone,
      user_data: {
        summary_mode: "true",
        summary_text: summaryText,
        patient_name: patientName || "ji",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `Summary Bolna call failed for ${familyPhone}:`,
      response.status,
      errorBody,
    );
    return false;
  }

  return true;
}

export async function fetchRecentCallLogs(
  patientName: string,
  sinceIso: string,
): Promise<CallLog[]> {
  const { data, error } = await supabase
    .from("call_logs")
    .select("*")
    .eq("patient_name", patientName)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchRecentCallLogs failed:", error);
    return [];
  }

  return (data ?? []) as CallLog[];
}

export async function markSummarySent(patientPhone: string): Promise<void> {
  const { error } = await supabase
    .from("patients")
    .update({ last_summary_sent_at: new Date().toISOString() })
    .eq("phone", patientPhone);

  if (error) {
    console.error("markSummarySent failed:", error);
  }
}
