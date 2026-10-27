import { NextResponse } from "next/server";
import { normalizeFindings, type TrainingLog } from "@/lib/training";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("training_logs")
    .select("id, analysis_date, calls_analyzed, findings, applied_to_b2b, created_at")
    .order("analysis_date", { ascending: false });

  if (error) {
    console.error("get-logs failed:", error);
    return NextResponse.json(
      { error: "Failed to load training logs", detail: error.message },
      { status: 500 },
    );
  }

  const logs: TrainingLog[] = (data ?? []).map((row) => ({
    id: String(row.id),
    analysis_date: row.analysis_date ?? row.created_at ?? new Date().toISOString(),
    calls_analyzed:
      typeof row.calls_analyzed === "number" ? row.calls_analyzed : null,
    findings: normalizeFindings(row.findings),
    applied_to_b2b: Boolean(row.applied_to_b2b),
    created_at: row.created_at ?? new Date().toISOString(),
  }));

  return NextResponse.json({ logs });
}
