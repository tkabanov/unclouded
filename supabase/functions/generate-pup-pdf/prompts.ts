import { generateText } from "npm:ai";
import { createChatModel } from "../_shared/openai-provider.ts";
import type { PupPdfNarrative, PupPdfTier } from "./types.ts";

const SYSTEM = `You are Dr. Sam writing short PDF report copy for Uncloud360 (PuP 360).
Voice: warm, direct, non-clinical, grounded. No therapy claims. No emojis.
Return ONLY valid JSON matching the requested schema. No markdown fences.`;

type NarrativeInput = {
  tier: PupPdfTier;
  firstName: string;
  scores: { stability: number; performance: number; alignment: number };
  classificationName: string;
  trajectoryType: string | null;
  trajectoryStatement: string | null;
  reflections: Array<{ question: string; answer: string }>;
  sessionMemorySnippets: string[];
  pathHistoryLines: string[];
};

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response was not JSON");
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function generatePdfNarrative(input: NarrativeInput): Promise<PupPdfNarrative> {
  const reflectionQ1 = input.reflections[0]?.answer ?? "";
  const reflectionBlock = input.reflections
    .filter((r) => r.answer.trim())
    .map((r, i) => `Q${i + 1}: ${r.question}\nA: ${r.answer}`)
    .join("\n\n");

  if (input.tier === "pro") {
    const { text } = await generateText({
      model: createChatModel(),
      system: SYSTEM,
      prompt: `Write a 3-4 sentence coaching context paragraph for ${input.firstName}'s Pro PuP 360 summary PDF.

Scores — Stability: ${input.scores.stability}, Performance: ${input.scores.performance}, Alignment: ${input.scores.alignment}
Classification: ${input.classificationName}
Trajectory: ${input.trajectoryType ?? "n/a"} — ${input.trajectoryStatement ?? ""}
Reflection answer 1: ${reflectionQ1 || "(not provided)"}

Return JSON: { "coachingContext": "..." }`,
    });
    const parsed = parseJsonObject(text);
    const coachingContext = asNonEmptyString(parsed.coachingContext);
    if (!coachingContext) throw new Error("Missing coachingContext from AI");
    return { coachingContext, coachingSummary: null, nextFocus: null };
  }

  const { text } = await generateText({
    model: createChatModel(),
    system: SYSTEM,
    prompt: `Write Premium PuP 360 diagnostic PDF narrative for ${input.firstName}.

Scores — Stability: ${input.scores.stability}, Performance: ${input.scores.performance}, Alignment: ${input.scores.alignment}
Classification: ${input.classificationName}
Trajectory: ${input.trajectoryType ?? "n/a"} — ${input.trajectoryStatement ?? ""}

Session memory (last sessions):
${input.sessionMemorySnippets.length ? input.sessionMemorySnippets.join("\n") : "(none)"}

Path completion history:
${input.pathHistoryLines.length ? input.pathHistoryLines.join("\n") : "(none)"}

Reflections:
${reflectionBlock || "(none)"}

Return JSON:
{
  "coachingContext": "3-4 sentence coaching context paragraph",
  "coachingSummary": "2-3 paragraphs summarizing coaching progress",
  "nextFocus": "clear next-90-day focus recommendations"
}`,
  });

  const parsed = parseJsonObject(text);
  const coachingContext = asNonEmptyString(parsed.coachingContext);
  const coachingSummary = asNonEmptyString(parsed.coachingSummary);
  const nextFocus = asNonEmptyString(parsed.nextFocus);
  if (!coachingContext || !coachingSummary || !nextFocus) {
    throw new Error("Incomplete Premium narrative from AI");
  }
  return { coachingContext, coachingSummary, nextFocus };
}
