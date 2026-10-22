import { NextResponse } from "next/server";
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

export async function POST() {
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

  const currentIst = getCurrentTimeIST();
  const duePatients = (patients as Patient[]).filter((patient) => {
    const normalized = normalizeReminderTime(patient.reminder_time);
    return normalized === currentIst;
  });

  let count = 0;

  for (const patient of duePatients) {
    try {
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
            patient_name: patient.name ?? "Patient",
            family_name: "Beta",
            medications: patient.medications ?? "",
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
        continue;
      }

      count += 1;
    } catch (err) {
      console.error(`Error triggering call for ${patient.phone}:`, err);
    }
  }

  return NextResponse.json({ triggered: count });
}
