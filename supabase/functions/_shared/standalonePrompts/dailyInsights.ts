import { parseJsonObject, readNonEmptyString, stripCodeFences } from "./parseJson.ts";

export type DailyInsightsResult = {
  insight_1: { title: string; body: string };
  insight_2: { title: string; body: string };
  insight_3: { title: string; body: string };
};

export type DailyInsightsInput = {
  classification: string;
  coachingMode: string;
  recentThemes: string;
  aiConfidenceLevel: string;
  activeFlags: string;
};

export function parseDailyInsights(raw: unknown): DailyInsightsResult | null {
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

  const readInsight = (key: string) => {
    const entry = row[key];
    if (!entry || typeof entry !== "object") return null;
    const obj = entry as Record<string, unknown>;
    const title = readNonEmptyString(obj.title, 80);
    const body = readNonEmptyString(obj.body, 4000);
    if (!title || !body) return null;
    return { title, body };
  };

  const insight_1 = readInsight("insight_1");
  const insight_2 = readInsight("insight_2");
  const insight_3 = readInsight("insight_3");
  if (!insight_1 || !insight_2 || !insight_3) return null;
  return { insight_1, insight_2, insight_3 };
}

export function buildDailyInsightsPrompt(input: DailyInsightsInput): {
  system: string;
  prompt: string;
} {
  const system =
    "You are Kota — the AI coaching presence inside Uncloud360, built on the PuP 360 framework. You are generating today's coaching insights for a user. Return a JSON object only — no preamble.";

  const prompt = `USER CONTEXT
Classification: ${input.classification}
Coaching mode: ${input.coachingMode}
Recent session themes: ${input.recentThemes}
AI confidence level: ${input.aiConfidenceLevel}
Active flags: ${input.activeFlags}

WHAT YOU ARE GENERATING
Three separate coaching insights. Each insight is 2–3 short paragraphs. They do not need to be related to each other. Each insight should:
— Be appropriate for the user's classification and coaching mode
— Feel like an observation or truth worth sitting with — not advice, not instruction
— Be written in Kota's voice: warm, direct, honest, grounded
— Draw lightly from recent session themes when relevant, but not be dominated by them
— Feel complete on its own — the user does not need session context to receive it

WHAT THE INSIGHTS ARE NOT
Not motivational quotes. Not generic wellness content. Not a recap of the session. Not cheerleading. Not instructions. Not a question that demands an answer.

TONE GUIDANCE BY COACHING MODE
If coaching_mode = Rebuilder: insights are gentle, grounding, stabilizing. Nothing that adds pressure.
If coaching_mode = Stabilizer: insights name the cost of the pattern without adding weight. Honest and steady.
If coaching_mode = Builder: insights are forward-facing, observational, slightly challenging.
If coaching_mode = Optimizer: insights push toward precision and the edges the user hasn't named yet.

FLAG ADJUSTMENTS
If grief_mode is active: at least one insight acknowledges the weight of grief without trying to resolve it.
If recovery_mode is active: insights honor the identity of recovery without centering substance use.
If high_emotional_load is active: all three insights stay grounding and do not introduce new challenges.

OUTPUT FORMAT
Return a JSON object with exactly this structure — no preamble, no explanation, just the JSON:
{
  "insight_1": { "title": "[short evocative title — 3 to 6 words]", "body": "[insight text — 2 to 3 short paragraphs separated by a blank line]" },
  "insight_2": { "title": "[short evocative title — 3 to 6 words]", "body": "[insight text — 2 to 3 short paragraphs separated by a blank line]" },
  "insight_3": { "title": "[short evocative title — 3 to 6 words]", "body": "[insight text — 2 to 3 short paragraphs separated by a blank line]" }
}`;

  return { system, prompt };
}
