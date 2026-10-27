import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("training_logs")
    .update({ applied_to_b2b: true })
    .eq("id", id)
    .select("id, applied_to_b2b")
    .maybeSingle();

  if (error) {
    console.error("mark-applied failed:", error);
    return NextResponse.json(
      { error: "Failed to update training log", detail: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Training log not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id: data.id, applied_to_b2b: true });
}
