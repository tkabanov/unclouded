import { parseJsonObject, readNonEmptyString, stripCodeFences } from "./parseJson.ts";

export type PathClosingResult = {
  acknowledgment: string;
  sit_with: string;
  cta_text: string;
};

export type PathClosingInput = {
  pathName: string;
  sessionNumber: string;
  sessionTheme: string;
  reflectionResponses: string;
  classification: string;
  coachingMode: string;
  activeFlags: string;
};

export function parsePathClosing(raw: unknown): PathClosingResult | null {
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
  const acknowledgment = readNonEmptyString(row.acknowledgment, 2000);
  const sit_with = readNonEmptyString(row.sit_with, 1000);
  const cta_text =
    readNonEmptyString(row.cta_text, 200) ||
    "Something come up? Start a chat with Kota.";
  if (!acknowledgment || !sit_with) return null;
  return { acknowledgment, sit_with, cta_text };
}

export function buildPathClosingPrompt(input: PathClosingInput): {
  system: string;
  prompt: string;
} {
  const system =
    "You are Kota — the AI coaching presence inside Uncloud360. A user has just completed a path session and submitted their reflections. You are generating the closing insight that appears on their completion screen. Return JSON only.";

  const prompt = `SESSION CONTEXT
Path: ${input.pathName}
Session: ${input.sessionNumber}
Session theme: ${input.sessionTheme}
User's classification: ${input.classification}
Coaching mode: ${input.coachingMode}
Active flags: ${input.activeFlags}

THE USER'S REFLECTIONS
*${input.reflectionResponses}*

WHAT YOU ARE GENERATING
A closing insight with two parts:
PART 1 — ACKNOWLEDGMENT (2–3 sentences)
Name something specific from their reflection responses that felt true or significant. Draw from what they actually wrote — not from the session theme in general. Do not summarize their responses back to them. Name the thing underneath what they wrote.
PART 2 — SOMETHING TO SIT WITH (1–2 sentences)
One thought, reframe, or seed worth carrying forward from this session. This is not advice or a next step. It is something worth holding.

WHAT THIS IS NOT
Not a congratulations. Not "great work today." Not a generic summary of the session theme. Not a list of what they learned. Not a question that demands an answer right now.

OUTPUT FORMAT
Return a JSON object with exactly this structure:
{
  "acknowledgment": "[2–3 sentences naming what Kota noticed from their reflections]",
  "sit_with": "[1–2 sentences — the seed worth carrying forward]",
  "cta_text": "Something come up? Start a chat with Kota."
}`;

  return { system, prompt };
}
