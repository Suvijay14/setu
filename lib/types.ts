export type MedicationTaken = "yes" | "no" | "unclear";
export type YesNo = "yes" | "no";

export interface BolnaExtractedData {
  medication_taken?: MedicationTaken;
  action_required?: YesNo;
  patient_concern?: string;
}

export interface BolnaWebhookPayload {
  call_id?: string;
  status?: string;
  transcript?: string;
  duration?: number;
  extracted_data?: BolnaExtractedData;
  [key: string]: unknown;
}

export interface CallLog {
  id: string;
  call_id: string;
  patient_name: string;
  status: string;
  medication_taken: MedicationTaken | null;
  action_required: YesNo | null;
  concern: string | null;
  transcript: string | null;
  duration: number | null;
  mood: string | null;
  summary: string | null;
  emergency: boolean | null;
  escalation_flag: boolean | null;
  sms_sent: boolean | null;
  org_id: string | null;
  refill_needed: boolean | null;
  refill_medicine: string | null;
  agent_type: string | null;
  protocol: string | null;
  created_at: string;
}

export type GroqOnboardingExtract = {
  name: string | null;
  medications: string | null;
  reminder_time: string | null;
  family_phone: string | null;
  location: string | null;
};
