export type AppointmentStatus = "pending" | "confirmed" | "cancelled";
export type AppointmentSource = "inbound" | "escalation";

export type Appointment = {
  id: string;
  patient_name: string;
  phone: string;
  doctor: string | null;
  symptoms: string | null;
  preferred_time: string | null;
  source: string | null;
  status: string | null;
  clinic_name: string | null;
  created_at: string;
};

export function normalizeAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: String(row.id),
    patient_name: String(row.patient_name ?? "Unknown"),
    phone: String(row.phone ?? ""),
    doctor: typeof row.doctor === "string" ? row.doctor : null,
    symptoms: typeof row.symptoms === "string" ? row.symptoms : null,
    preferred_time:
      typeof row.preferred_time === "string" ? row.preferred_time : null,
    source: typeof row.source === "string" ? row.source : null,
    status: typeof row.status === "string" ? row.status : null,
    clinic_name: typeof row.clinic_name === "string" ? row.clinic_name : null,
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
  };
}

export function buildInboundAppointmentSmsBody(input: {
  patient_name: string;
  phone: string;
  symptoms: string;
  preferred_time: string;
  doctor: string;
  clinic_name: string;
}): string {
  return `🏥 New Appointment Request - ${input.clinic_name}
Patient: ${input.patient_name}
Phone: ${input.phone}
Symptoms: ${input.symptoms}
Preferred time: ${input.preferred_time}
Doctor: ${input.doctor}
Reply to confirm or call patient directly.`;
}

export function buildEscalationAppointmentSmsBody(input: {
  patient_name: string;
  discharge_date: string;
  doctor: string;
  call_summary: string;
  phone: string;
  clinic_name: string;
}): string {
  return `⚠️ ESCALATION ALERT - ${input.clinic_name}
Patient: ${input.patient_name} (discharged ${input.discharge_date})
Doctor: ${input.doctor}
Issue: ${input.call_summary}
Phone: ${input.phone}
Action needed: Follow-up appointment required.`;
}
