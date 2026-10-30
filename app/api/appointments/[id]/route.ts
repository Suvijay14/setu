import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteContext = { params: { id: string } };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const id = context.params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status?.trim();
  if (status !== "confirmed" && status !== "cancelled") {
    return NextResponse.json(
      { error: "status must be confirmed or cancelled" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("appointment PATCH failed:", error);
    return NextResponse.json(
      { error: "Failed to update appointment", detail: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id: data.id, status: data.status });
}
