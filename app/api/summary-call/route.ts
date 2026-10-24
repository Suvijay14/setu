import { NextRequest, NextResponse } from "next/server";
import type { Patient } from "@/lib/patient";
import {
  buildRawSummaryFromLogs,
  fetchRecentCallLogs,
  fireSummaryBolnaCall,
  generateHindiSummaryParagraph,
  getLogLookbackIso,
  isSummaryFrequencyDue,
  isSummaryTimeWindowDue,
  markSummarySent,
  type SummaryFrequency,
} from "@/lib/summaryCall";
import { supabase } from "@/lib/supabase";

async function handleSummaryCall(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "true";
  const apiKey = process.env.BOLNA_API_KEY;
  const agentId = process.env.BOLNA_AGENT_ID;

  if (!apiKey || !agentId) {
    console.error("Missing BOLNA_API_KEY or BOLNA_AGENT_ID");
    return NextResponse.json({ triggered: 0 });
  }

  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .eq("onboarded", true);

  if (error) {
    console.error("Failed to fetch patients for summary call:", error);
    return NextResponse.json({ triggered: 0 });
  }

  const now = new Date();
  let triggered = 0;

  for (const row of patients ?? []) {
    const patient = row as Patient;
    const frequency = (patient.child_summary_frequency ||
      "daily") as SummaryFrequency;
    const summaryTime = patient.child_summary_time || "20:00";

    if (frequency === "never") {
      continue;
    }

    if (!patient.family_phone || !patient.name) {
      continue;
    }

    if (
      !force &&
      (!isSummaryTimeWindowDue(summaryTime, now) ||
        !isSummaryFrequencyDue(frequency, patient.last_summary_sent_at, now))
    ) {
      continue;
    }

    const sinceIso = getLogLookbackIso(frequency, now);
    const logs = await fetchRecentCallLogs(patient.name, sinceIso);
    const raw = buildRawSummaryFromLogs(patient, logs);
    const summaryText = await generateHindiSummaryParagraph(
      raw,
      patient.name,
    );

    const ok = await fireSummaryBolnaCall(
      apiKey,
      agentId,
      patient.family_phone,
      patient.name,
      summaryText,
    );

    if (ok) {
      await markSummarySent(patient.phone);
      triggered += 1;
    }
  }

  return NextResponse.json({ triggered });
}

export async function GET(request: NextRequest) {
  return handleSummaryCall(request);
}

export async function POST(request: NextRequest) {
  return handleSummaryCall(request);
}
