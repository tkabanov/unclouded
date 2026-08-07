import { generateStandaloneText } from "./openaiGenerate.ts";
import {
  buildDailyInsightsPrompt,
  parseDailyInsights,
  type DailyInsightsInput,
  type DailyInsightsResult,
} from "./dailyInsights.ts";
import {
  buildJournalReflectionPrompt,
  type JournalReflectionInput,
} from "./journalReflection.ts";
import {
  buildPathClosingPrompt,
  parsePathClosing,
  type PathClosingInput,
  type PathClosingResult,
} from "./pathClosing.ts";
import {
  buildTrajectoryStatementPrompt,
  type TrajectoryStatementInput,
} from "./trajectoryStatement.ts";
import {
  buildCoachingSummaryPrompt,
  parseCoachingSummary,
  type CoachingSummaryInput,
  type CoachingSummaryResult,
} from "./coachingSummary.ts";
import { readNonEmptyString } from "./parseJson.ts";

export async function generateDailyInsights(
  input: DailyInsightsInput,
): Promise<DailyInsightsResult> {
  const { system, prompt } = buildDailyInsightsPrompt(input);
  const text = await generateStandaloneText({ system, prompt, temperature: 0.6 });
  const parsed = parseDailyInsights(text);
  if (!parsed) throw new Error("Invalid daily insights JSON");
  return parsed;
}

export async function generateJournalReflectionText(
  input: JournalReflectionInput,
): Promise<string> {
  const { system, prompt } = buildJournalReflectionPrompt(input);
  const text = await generateStandaloneText({ system, prompt, temperature: 0.45 });
  const cleaned = readNonEmptyString(text, 2000);
  if (!cleaned) throw new Error("Empty journal reflection");
  return cleaned;
}

export async function generatePathClosingInsight(
  input: PathClosingInput,
): Promise<PathClosingResult> {
  const { system, prompt } = buildPathClosingPrompt(input);
  const text = await generateStandaloneText({ system, prompt, temperature: 0.5 });
  const parsed = parsePathClosing(text);
  if (!parsed) throw new Error("Invalid path closing JSON");
  return parsed;
}

export async function generateTrajectoryStatementText(
  input: TrajectoryStatementInput,
): Promise<string> {
  const { system, prompt } = buildTrajectoryStatementPrompt(input);
  const text = await generateStandaloneText({ system, prompt, temperature: 0.4 });
  const cleaned = readNonEmptyString(text, 1500);
  if (!cleaned) throw new Error("Empty trajectory statement");
  return cleaned;
}

export async function generateCoachingSummary(
  input: CoachingSummaryInput,
): Promise<CoachingSummaryResult> {
  const { system, prompt } = buildCoachingSummaryPrompt(input);
  const text = await generateStandaloneText({ system, prompt, temperature: 0.5 });
  const parsed = parseCoachingSummary(text);
  if (!parsed) throw new Error("Invalid coaching summary JSON");
  return parsed;
}
