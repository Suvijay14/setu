import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let body: { access_code?: string };
  try {
    body = (await request.json()) as { access_code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const access_code = body.access_code?.trim();
  if (!access_code) {
    return NextResponse.json(
      { error: "access_code is required" },
      { status: 400 },
    );
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, type")
    .eq("access_code", access_code)
    .maybeSingle();

  if (error) {
    console.error("org login lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to verify access code" },
      { status: 500 },
    );
  }

  if (!org) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  return NextResponse.json({
    org: {
      id: org.id as string,
      name: org.name as string,
      type: org.type as string,
    },
  });
}
