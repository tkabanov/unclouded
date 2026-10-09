import { generateStandaloneText } from "./openaiGenerate.ts";
import type { AiUsageSource } from "../aiUsage.ts";

/** Optional ledger attribution (NCLDD-52). */
export type StandaloneUsageOwner = { userId: string };

function ledger(owner: StandaloneUsageOwner | undefined, source: AiUsageSource) {
  return owner ? { userId: owner.userId, source } : undefined;
}
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
  owner?: StandaloneUsageOwner,
): Promise<DailyInsightsResult> {
  const { system, prompt } = buildDailyInsightsPrompt(input);
  const text = await generateStandaloneText({
    system,
    prompt,
    temperature: 0.6,
    usage: ledger(owner, "standalone_insight"),
  });
  const parsed = parseDailyInsights(text);
  if (!parsed) throw new Error("Invalid daily insights JSON");
  return parsed;
}

export async function generateJournalReflectionText(
  input: JournalReflectionInput,
  owner?: StandaloneUsageOwner,
): Promise<string> {
  const { system, prompt } = buildJournalReflectionPrompt(input);
  const text = await generateStandaloneText({
    system,
    prompt,
    temperature: 0.45,
    usage: ledger(owner, "journal_reflection"),
  });
  const cleaned = readNonEmptyString(text, 2000);
  if (!cleaned) throw new Error("Empty journal reflection");
  return cleaned;
}

export async function generatePathClosingInsight(
  input: PathClosingInput,
  owner?: StandaloneUsageOwner,
): Promise<PathClosingResult> {
  const { system, prompt } = buildPathClosingPrompt(input);
  const text = await generateStandaloneText({
    system,
    prompt,
    temperature: 0.5,
    usage: ledger(owner, "path_closing"),
  });
  const parsed = parsePathClosing(text);
  if (!parsed) throw new Error("Invalid path closing JSON");
  return parsed;
}

export async function generateTrajectoryStatementText(
  input: TrajectoryStatementInput,
  owner?: StandaloneUsageOwner,
): Promise<string> {
  const { system, prompt } = buildTrajectoryStatementPrompt(input);
  const text = await generateStandaloneText({
    system,
    prompt,
    temperature: 0.4,
    usage: ledger(owner, "trajectory_statement"),
  });
  const cleaned = readNonEmptyString(text, 1500);
  if (!cleaned) throw new Error("Empty trajectory statement");
  return cleaned;
}

export async function generateCoachingSummary(
  input: CoachingSummaryInput,
  owner?: StandaloneUsageOwner,
): Promise<CoachingSummaryResult> {
  const { system, prompt } = buildCoachingSummaryPrompt(input);
  const text = await generateStandaloneText({
    system,
    prompt,
    temperature: 0.5,
    usage: ledger(owner, "coaching_summary"),
  });
  const parsed = parseCoachingSummary(text);
  if (!parsed) throw new Error("Invalid coaching summary JSON");
  return parsed;
}
