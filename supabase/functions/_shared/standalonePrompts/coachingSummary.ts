import { parseJsonObject, readNonEmptyString, stripCodeFences } from "./parseJson.ts";

export type CoachingSummaryResult = {
  section_1_title: string;
  section_1_body: string;
  section_2_title: string;
  section_2_body: string;
  section_3_title: string;
  section_3_body: string;
  section_4_title: string;
  section_4_body: string;
  section_5_title: string;
  section_5_body: string;
};

export type CoachingSummaryInput = {
  classificationHistory: string;
  stabilityHistory: string;
  performanceHistory: string;
  alignmentHistory: string;
  pathsCompleted: string;
  sessionMemoryCompressed: string;
  confirmedFingerprintSignals: string;
  activeFlags: string;
  coachingModeHistory: string;
  commitmentFollowthroughRate: string;
};

const DEFAULT_TITLES = {
  section_1_title: "Where You Started",
  section_2_title: "What Moved",
  section_3_title: "What Came Up",
  section_4_title: "What the Data Reveals",
  section_5_title: "The Next Chapter",
} as const;

export function parseCoachingSummary(raw: unknown): CoachingSummaryResult | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = parseJsonObject(stripCodeFences(raw));
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;

  const body1 = readNonEmptyString(row.section_1_body, 4000);
  const body2 = readNonEmptyString(row.section_2_body, 4000);
  const body3 = readNonEmptyString(row.section_3_body, 4000);
  const body4 = readNonEmptyString(row.section_4_body, 4000);
  const body5 = readNonEmptyString(row.section_5_body, 4000);
  if (!body1 || !body2 || !body3 || !body4 || !body5) return null;

  return {
    section_1_title: readNonEmptyString(row.section_1_title, 80) || DEFAULT_TITLES.section_1_title,
    section_1_body: body1,
    section_2_title: readNonEmptyString(row.section_2_title, 80) || DEFAULT_TITLES.section_2_title,
    section_2_body: body2,
    section_3_title: readNonEmptyString(row.section_3_title, 80) || DEFAULT_TITLES.section_3_title,
    section_3_body: body3,
    section_4_title: readNonEmptyString(row.section_4_title, 80) || DEFAULT_TITLES.section_4_title,
    section_4_body: body4,
    section_5_title: readNonEmptyString(row.section_5_title, 80) || DEFAULT_TITLES.section_5_title,
    section_5_body: body5,
  };
}

export function buildCoachingSummaryPrompt(input: CoachingSummaryInput): {
  system: string;
  prompt: string;
} {
  const system =
    "You are Kota — the AI coaching presence inside Uncloud360. You are generating the Coaching Summary section of a Premium user's Complete Coaching Record — a PDF they receive at their 90-day reassessment. Return JSON only.";

  const prompt = `USER DATA
Classification journey: ${input.classificationHistory}
Stability scores: ${input.stabilityHistory}
Performance scores: ${input.performanceHistory}
Alignment scores: ${input.alignmentHistory}
Paths completed: ${input.pathsCompleted}
Session themes (compressed): ${input.sessionMemoryCompressed}
Confirmed behavioral fingerprint signals: ${input.confirmedFingerprintSignals}
Active flags: ${input.activeFlags}
Coaching mode journey: ${input.coachingModeHistory}
Commitment follow-through rate: ${input.commitmentFollowthroughRate}

WHAT YOU ARE GENERATING
A coaching summary with five sections. Each section is clearly labeled. The entire summary should read as a coherent narrative in Kota's voice — honest, warm, specific to this person.

SECTION 1 — WHO YOU WERE WHEN YOU STARTED (2–3 sentences)
SECTION 2 — WHAT MOVED (3–4 sentences)
SECTION 3 — THEMES FROM YOUR COACHING (2–3 sentences)
SECTION 4 — WHAT THE DATA REVEALS ABOUT YOU (2–3 sentences)
SECTION 5 — THE NEXT CHAPTER (2–3 sentences)

OUTPUT FORMAT
Return a JSON object with exactly this structure:
{
  "section_1_title": "Where You Started",
  "section_1_body": "[text]",
  "section_2_title": "What Moved",
  "section_2_body": "[text]",
  "section_3_title": "What Came Up",
  "section_3_body": "[text]",
  "section_4_title": "What the Data Reveals",
  "section_4_body": "[text]",
  "section_5_title": "The Next Chapter",
  "section_5_body": "[text]"
}`;

  return { system, prompt };
}
