export type TrainingFindings = {
  confusion_points: string[];
  medication_variants: Record<string, string[]>;
  regional_words: string[];
  escalation_accuracy: string;
  best_greetings: string[];
  recommendations_for_b2b: string[];
};

export type TrainingLog = {
  id: string;
  analysis_date: string;
  calls_analyzed: number | null;
  findings: TrainingFindings;
  applied_to_b2b: boolean;
  created_at: string;
};

export function emptyTrainingFindings(): TrainingFindings {
  return {
    confusion_points: [],
    medication_variants: {},
    regional_words: [],
    escalation_accuracy: "0%",
    best_greetings: [],
    recommendations_for_b2b: [],
  };
}

export function normalizeFindings(raw: unknown): TrainingFindings {
  if (!raw || typeof raw !== "object") {
    return emptyTrainingFindings();
  }
  const f = raw as Record<string, unknown>;
  return {
    confusion_points: Array.isArray(f.confusion_points)
      ? f.confusion_points.filter((x): x is string => typeof x === "string")
      : [],
    medication_variants:
      f.medication_variants && typeof f.medication_variants === "object"
        ? (f.medication_variants as Record<string, string[]>)
        : {},
    regional_words: Array.isArray(f.regional_words)
      ? f.regional_words.filter((x): x is string => typeof x === "string")
      : [],
    escalation_accuracy:
      typeof f.escalation_accuracy === "string" ? f.escalation_accuracy : "0%",
    best_greetings: Array.isArray(f.best_greetings)
      ? f.best_greetings.filter((x): x is string => typeof x === "string")
      : [],
    recommendations_for_b2b: Array.isArray(f.recommendations_for_b2b)
      ? f.recommendations_for_b2b.filter((x): x is string => typeof x === "string")
      : [],
  };
}
