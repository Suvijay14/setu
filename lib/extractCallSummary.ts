const GROQ_MODEL = "qwen/qwen3.8-27b";

export type CallSummaryExtract = {
  mood: string | null;
  summary: string | null;
  emergency: boolean;
  sms_sent: boolean;
};

export type RefillIntentExtract = {
  refill_needed: boolean;
  medicine: string | null;
};

export type B2cCallExtract = {
  medication_taken: "yes" | "no" | "unclear";
  mood: string | null;
  emergency: boolean;
  conversation_clarity: string | null;
  medication_names_used: string[];
  confusion_detected: boolean;
};

function parseGroqJson<T>(content: string): T | null {
  const jsonText = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return null;
  }
}

async function groqChat(userContent: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: userContent }],
          max_tokens: maxTokens,
        }),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function extractCallSummary(
  transcript: string,
  medicationTaken: string | null,
  actionRequired: string | null,
): Promise<CallSummaryExtract | null> {
  if (!transcript) return null;

  const content = await groqChat(
    `Analyze this Hindi voice call transcript between an elderly parent and Setu AI.

Transcript:
${transcript}

Return ONLY valid JSON:
{
  "mood": "happy/neutral/sad/anxious/confused",
  "summary": "one line in English describing what happened in the call",
  "emergency": true/false,
  "sms_sent": ${actionRequired === "yes" ? "true" : "false"}
}

mood: detect from patient's tone and words.
summary: brief factual summary like "Ramesh confirmed taking BP tablet at 9pm."
emergency: true only if patient mentioned chest pain, fall, breathing issue.`,
    100,
  );

  if (!content) {
    console.error("Groq call summary extract failed or empty");
    return null;
  }

  const parsed = parseGroqJson<CallSummaryExtract>(content);
  if (!parsed) {
    console.error("extractCallSummary parse failed");
  }
  return parsed;
}

export async function extractRefillIntent(
  transcript: string,
  knownMedications?: string | null,
): Promise<RefillIntentExtract | null> {
  if (!transcript) return null;

  const medContext = knownMedications?.trim()
    ? `\nPatient's registered medicines (if helpful): ${knownMedications.trim()}`
    : "";

  const content = await groqChat(
    `From this Hindi/English mix voice call transcript, detect if the patient says their medicine ran out or they need a refill.

Look for phrases like: "ran out", "khatam ho gaya", "khatam ho gayi", "dawai nahi hai", "tablet khatam", "medicine finish", "refill chahiye", "nayi dawai".

Transcript:
${transcript}
${medContext}

Return ONLY valid JSON:
{
  "refill_needed": true or false,
  "medicine": "specific medicine name in English or Hindi transliteration, or null if unclear"
}

refill_needed: true only if the patient clearly indicates they are out of medicine or need more.
medicine: the medicine they said is finished; if multiple, pick the one they emphasized; null if refill_needed is false.`,
    120,
  );

  if (!content) {
    console.error("Groq refill intent extract failed or empty");
    return null;
  }

  const parsed = parseGroqJson<{ refill_needed?: boolean; medicine?: string | null }>(
    content,
  );
  if (!parsed) {
    console.error("extractRefillIntent parse failed");
    return null;
  }

  const refill_needed = parsed.refill_needed === true;
  const medicine =
    typeof parsed.medicine === "string" && parsed.medicine.trim()
      ? parsed.medicine.trim()
      : null;

  return {
    refill_needed,
    medicine: refill_needed ? medicine : null,
  };
}

export async function extractB2cCallFields(
  transcript: string,
): Promise<B2cCallExtract | null> {
  if (!transcript) return null;

  const content = await groqChat(
    `Analyze this Hindi family/eldercare voice call (Setu B2C).

Transcript:
${transcript}

Return ONLY valid JSON:
{
  "medication_taken": "yes" | "no" | "unclear",
  "mood": "happy/neutral/sad/anxious/confused or null",
  "emergency": true or false,
  "conversation_clarity": "clear" | "partial" | "confused",
  "medication_names_used": ["exact medicine names or Hindi variants the patient said"],
  "confusion_detected": true or false
}

medication_taken: yes only if they clearly confirmed taking medicine today/this dose.
emergency: chest pain, fall, breathing trouble, severe distress.
confusion_detected: true if patient repeated themselves, misunderstood the agent, or looped on names/times.`,
    280,
  );

  if (!content) {
    console.error("Groq B2C call extract failed or empty");
    return null;
  }

  const parsed = parseGroqJson<{
    medication_taken?: string;
    mood?: string | null;
    emergency?: boolean;
    conversation_clarity?: string | null;
    medication_names_used?: unknown;
    confusion_detected?: boolean;
  }>(content);

  if (!parsed) {
    console.error("extractB2cCallFields parse failed");
    return null;
  }

  const med = parsed.medication_taken?.toLowerCase();
  const medication_taken =
    med === "yes" || med === "no" || med === "unclear" ? med : "unclear";

  const medication_names_used = Array.isArray(parsed.medication_names_used)
    ? parsed.medication_names_used.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];

  return {
    medication_taken,
    mood: typeof parsed.mood === "string" ? parsed.mood : null,
    emergency: parsed.emergency === true,
    conversation_clarity:
      typeof parsed.conversation_clarity === "string"
        ? parsed.conversation_clarity
        : null,
    medication_names_used,
    confusion_detected: parsed.confusion_detected === true,
  };
}
