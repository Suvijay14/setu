import { NextResponse } from "next/server";

const BOLNA_CALL_URL = "https://api.bolna.dev/call";
const DEFAULT_DEMO_RECIPIENT = "+919910036896";

export async function POST() {
  const apiKey = process.env.BOLNA_API_KEY;
  const agentId = process.env.BOLNA_AGENT_ID;
  const recipient =
    process.env.OUTBOUND_DEMO_PHONE?.trim() || DEFAULT_DEMO_RECIPIENT;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "Missing BOLNA_API_KEY or BOLNA_AGENT_ID" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(BOLNA_CALL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        recipient_phone_number: recipient,
        user_data: {
          patient_name: "Demo Visitor",
          medications: "Amlodipine 5mg",
          discharge_date: "October 28",
          doctor: "Dr. Sharma",
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!res.ok) {
      console.error("trigger-outbound-call failed:", res.status, data);
      return NextResponse.json({ error: data }, { status: 500 });
    }

    const callId =
      typeof data.call_id === "string"
        ? data.call_id
        : typeof data.execution_id === "string"
          ? data.execution_id
          : null;

    return NextResponse.json({ success: true, call_id: callId });
  } catch (error) {
    console.error("trigger-outbound-call error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to trigger call",
      },
      { status: 500 },
    );
  }
}
