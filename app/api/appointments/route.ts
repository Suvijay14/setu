import { NextResponse } from "next/server";
import { normalizeAppointment } from "@/lib/appointments";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("appointments list failed:", error);
    return NextResponse.json(
      { error: "Failed to load appointments", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    appointments: (data ?? []).map((row) =>
      normalizeAppointment(row as Record<string, unknown>),
    ),
  });
}
