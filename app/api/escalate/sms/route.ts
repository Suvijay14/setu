import { NextRequest, NextResponse } from "next/server";
import { sendEscalationSmsToClinic } from "@/lib/escalationSms";

type EscalateBody = {
  patient_id?: string;
  org_id?: string;
  escalation_reason?: string;
  call_transcript?: string;
  patient_name?: string;
};

export async function POST(request: NextRequest) {
  let body: EscalateBody;
  try {
    body = (await request.json()) as EscalateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patient_id = body.patient_id?.trim();
  const org_id = body.org_id?.trim();
  const escalation_reason = body.escalation_reason?.trim();
  const call_transcript = body.call_transcript ?? "";
  const patient_name = body.patient_name?.trim() || "Patient";

  if (!patient_id || !org_id || !escalation_reason) {
    return NextResponse.json(
      {
        error:
          "patient_id, org_id, and escalation_reason are required",
      },
      { status: 400 },
    );
  }

  const result = await sendEscalationSmsToClinic({
    patient_id,
    org_id,
    escalation_reason,
    call_transcript,
    patient_name,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error, sent: false }, { status: 500 });
  }

  return NextResponse.json({
    sent: result.sent,
    skipped: result.skipped ?? null,
  });
}
