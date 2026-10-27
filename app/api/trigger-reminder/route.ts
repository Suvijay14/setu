import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/patient";

const BOLNA_CALL_URL = "https://api.bolna.dev/call";

function getCurrentTimeIST(): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function normalizeReminderTime(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return trimmed;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function hasPlaceholderPhone(phone: string): boolean {
  return phone.startsWith("onboarding_") || phone.startsWith("temp_");
}

async function triggerBolnaCall(
  apiKey: string,
  agentId: string,
  patient: Patient,
): Promise<boolean> {
  const response = await fetch(BOLNA_CALL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: agentId,
      recipient_phone_number: patient.phone,
      user_data: {
        agent_type: patient.org_id ? "b2b" : "b2c",
        patient_name: patient.name || "ji",
        family_name: "aapke ghar walon",
        medications: patient.medications || "apni dawai",
        last_call_notes: patient.last_call_notes || "",
        call_streak: patient.call_streak?.toString() || "0",
        family_message: patient.family_message || "",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `Bolna call failed for ${patient.phone}:`,
      response.status,
      errorBody,
    );
    return false;
  }

  const { error: clearError } = await supabase
    .from("patients")
    .update({
      family_message_sent: true,
      family_message: null,
    })
    .eq("phone", patient.phone);

  if (clearError) {
    console.error(
      `Failed to mark family message sent for ${patient.phone}:`,
      clearError,
    );
  }

  return true;
}

const NO_ANSWER_RETRY_DELAY_MS = 600_000;

// TODO: Use Vercel cron or Bolna Workflow for production retry
function scheduleNoAnswerRetry(
  apiKey: string,
  agentId: string,
  patient: Patient,
  callStartedAt: string,
): void {
  if (process.env.VERCEL === "1") {
    return;
  }

  setTimeout(async () => {
    if (!patient.name) {
      console.log(
        `No-answer retry skipped: missing patient name for ${patient.phone}`,
      );
      return;
    }

    const { data: logs, error } = await supabase
      .from("call_logs")
      .select("status")
      .eq("patient_name", patient.name)
      .gte("created_at", callStartedAt)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(
        `No-answer retry check failed for ${patient.name}:`,
        error,
      );
      return;
    }

    const latestStatus = logs?.[0]?.status;

    if (latestStatus === "completed") {
      console.log(`No-answer retry skipped: ${patient.name} completed call`);
      return;
    }

    if (latestStatus === "no-answer") {
      console.log(`No answer for ${patient.name}, firing retry Bolna call`);
      await triggerBolnaCall(apiKey, agentId, patient);
      return;
    }

    console.log(
      `No-answer retry skipped for ${patient.name}: latest status ${latestStatus ?? "none"}`,
    );
  }, NO_ANSWER_RETRY_DELAY_MS);
}

async function handleTriggerReminder(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "true";
  const apiKey = process.env.BOLNA_API_KEY;
  const agentId = process.env.BOLNA_AGENT_ID;

  if (!apiKey) {
    console.error("Missing BOLNA_API_KEY environment variable");
    return NextResponse.json({ triggered: 0 });
  }

  if (!agentId) {
    console.error("Missing BOLNA_AGENT_ID environment variable");
    return NextResponse.json({ triggered: 0 });
  }

  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .eq("onboarded", true);

  if (error) {
    console.error("Failed to fetch onboarded patients:", error);
    return NextResponse.json({ triggered: 0 });
  }

  const onboardedPatients = patients as Patient[];
  const duePatients = force
    ? onboardedPatients
    : onboardedPatients.filter((patient) => {
        const normalized = normalizeReminderTime(patient.reminder_time);
        return normalized === getCurrentTimeIST();
      });

  const callablePatients = duePatients.filter(
    (patient) => !hasPlaceholderPhone(patient.phone),
  );

  for (const patient of duePatients) {
    if (hasPlaceholderPhone(patient.phone)) {
      console.log("Skipping patient with no real phone number");
    }
  }

  const callStartedAt = new Date().toISOString();

  const results = await Promise.allSettled(
    callablePatients.map((patient) =>
      triggerBolnaCall(apiKey, agentId, patient),
    ),
  );

  const count = results.filter(
    (result) => result.status === "fulfilled" && result.value === true,
  ).length;

  callablePatients.forEach((patient, index) => {
    const result = results[index];
    if (result.status === "fulfilled" && result.value === true) {
      scheduleNoAnswerRetry(apiKey, agentId, patient, callStartedAt);
    }
  });

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Error triggering call:", result.reason);
    }
  }

  return NextResponse.json({ triggered: count });
}

export async function GET(request: NextRequest) {
  return handleTriggerReminder(request);
}

export async function POST(request: NextRequest) {
  return handleTriggerReminder(request);
}
