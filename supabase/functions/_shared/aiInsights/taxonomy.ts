/**
 * NCLDD-55 (OVR-073) — closed taxonomy for consent-based AI Insights.
 *
 * The session classifier may only emit keys from these lists, so admin aggregates never
 * contain free text from a conversation. Pure TS (no Deno imports): the frontend imports
 * this module for labels and consent constants.
 */

/**
 * Bump when the consent copy or analysis terms change; users who answered another version are
 * asked again and their old consent counts nowhere. Must equal SQL
 * public.ai_insights_consent_version() — change both in one migration.
 */
export const AI_INSIGHTS_CONSENT_VERSION = 1;

/** Bump when the classifier prompt or taxonomy semantics change. */
export const AI_INSIGHTS_CLASSIFIER_VERSION = 2;

/** Minimum distinct consenting users behind any number shown to admins. */
export const AI_INSIGHTS_MIN_COHORT_SIZE = 5;

export type TaxonomyEntry<K extends string = string> = {
  key: K;
  label: string;
};

export const AI_INSIGHT_TOPICS = [
  { key: "work_stress", label: "Work stress" },
  { key: "burnout_energy", label: "Burnout and low energy" },
  { key: "workload_time", label: "Workload and time management" },
  { key: "leadership_management", label: "Leadership and managing people" },
  { key: "team_conflict", label: "Team dynamics and conflict" },
  { key: "career_growth", label: "Career growth and direction" },
  { key: "decision_making", label: "Decision making" },
  { key: "communication", label: "Communication" },
  { key: "personal_relationships", label: "Personal relationships" },
  { key: "work_life_balance", label: "Work-life balance" },
  { key: "confidence_self_worth", label: "Confidence and self-worth" },
  { key: "anxiety_worry", label: "Anxiety and worry" },
  { key: "motivation_goals", label: "Motivation and goals" },
  { key: "health_habits", label: "Sleep, health and habits" },
  { key: "change_transition", label: "Change and transitions" },
  { key: "emotional_regulation", label: "Managing emotions" },
  { key: "other", label: "Other" },
] as const satisfies readonly TaxonomyEntry[];

export const AI_INSIGHT_REQUEST_TYPES = [
  { key: "vent_be_heard", label: "Wants to talk through how they feel" },
  { key: "prioritize_workload", label: "How do I prioritize my workload?" },
  { key: "difficult_conversation", label: "How do I handle a difficult conversation?" },
  { key: "give_feedback", label: "How do I give feedback to someone?" },
  { key: "resolve_conflict", label: "How do I resolve a conflict?" },
  { key: "make_decision", label: "Help me make a decision" },
  { key: "set_boundaries", label: "How do I set boundaries?" },
  { key: "calm_down_now", label: "Help me calm down right now" },
  { key: "plan_week", label: "Help me plan my week" },
  { key: "set_goals", label: "Help me set or review goals" },
  { key: "build_habit", label: "How do I build a new habit?" },
  { key: "improve_focus", label: "How do I focus better?" },
  { key: "lead_team", label: "How do I lead or motivate my team?" },
  { key: "manage_up", label: "How do I work with my manager?" },
  { key: "career_next_step", label: "What should my next career step be?" },
  { key: "prepare_review", label: "Help me prepare for an interview or review" },
  { key: "rebuild_confidence", label: "How do I feel more confident?" },
  { key: "recover_setback", label: "How do I recover from a setback?" },
  { key: "rest_recovery", label: "How do I rest and recover better?" },
  { key: "balance_work_family", label: "How do I balance work and family?" },
  { key: "navigate_change", label: "How do I cope with change at work?" },
  { key: "reflect_progress", label: "Help me reflect on my progress" },
  { key: "process_emotions", label: "Help me make sense of my emotions" },
  { key: "find_resources", label: "Asks for resources or tools" },
  { key: "other", label: "Other request" },
] as const satisfies readonly TaxonomyEntry[];

export const AI_INSIGHT_CONCERNS = [
  { key: "overwhelm", label: "Feeling overwhelmed" },
  { key: "burnout_risk", label: "Signs of burnout" },
  { key: "job_insecurity", label: "Job insecurity" },
  { key: "isolation", label: "Isolation or loneliness" },
  { key: "conflict_tension", label: "Conflict or tension with others" },
  { key: "self_doubt", label: "Self-doubt" },
  { key: "future_uncertainty", label: "Uncertainty about the future" },
  { key: "low_motivation", label: "Low motivation" },
  { key: "health_wellbeing", label: "Health and wellbeing" },
  { key: "financial_pressure", label: "Financial pressure" },
  { key: "recognition_fairness", label: "Recognition and fairness" },
] as const satisfies readonly TaxonomyEntry[];

/** Explicit 👍 / 👎 reasons on Kota replies. Must match `set_ai_message_feedback` in SQL. */
export const AI_FEEDBACK_POSITIVE_REASONS = [
  { key: "helpful_advice", label: "Helpful advice" },
  { key: "felt_understood", label: "Felt understood" },
  { key: "clear_next_step", label: "Clear next step" },
] as const satisfies readonly TaxonomyEntry[];

export const AI_FEEDBACK_NEGATIVE_REASONS = [
  { key: "too_generic", label: "Too generic" },
  { key: "not_relevant", label: "Not relevant" },
  { key: "misunderstood_me", label: "Misunderstood me" },
  { key: "too_long", label: "Too long" },
  { key: "other", label: "Other" },
] as const satisfies readonly TaxonomyEntry[];

export type AiInsightTopicKey = (typeof AI_INSIGHT_TOPICS)[number]["key"];
export type AiInsightRequestTypeKey = (typeof AI_INSIGHT_REQUEST_TYPES)[number]["key"];
export type AiInsightConcernKey = (typeof AI_INSIGHT_CONCERNS)[number]["key"];
export type AiFeedbackReasonKey =
  | (typeof AI_FEEDBACK_POSITIVE_REASONS)[number]["key"]
  | (typeof AI_FEEDBACK_NEGATIVE_REASONS)[number]["key"];

export function taxonomyKeys<T extends readonly TaxonomyEntry[]>(entries: T): Set<string> {
  return new Set(entries.map((entry) => entry.key));
}

/** Label for a key, falling back to the raw key for values from an older taxonomy. */
export function taxonomyLabel(entries: readonly TaxonomyEntry[], key: string): string {
  return entries.find((entry) => entry.key === key)?.label ?? key;
}

/** Keep only known keys, de-duplicated, in input order, capped at `max`. */
export function filterTaxonomyKeys(
  value: unknown,
  allowed: Set<string>,
  max: number,
): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const key = item.trim().toLowerCase();
    if (!allowed.has(key) || out.includes(key)) continue;
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

/** Consent counts only when granted for the current terms version. */
export function hasValidAiInsightsConsent(
  consent: boolean | null | undefined,
  version: number | null | undefined,
): boolean {
  return consent === true && version === AI_INSIGHTS_CONSENT_VERSION;
}

/** The first-use prompt is needed until the user answers the current terms version. */
export function needsAiInsightsConsentPrompt(
  consent: boolean | null | undefined,
  version: number | null | undefined,
): boolean {
  return consent == null || version !== AI_INSIGHTS_CONSENT_VERSION;
}
