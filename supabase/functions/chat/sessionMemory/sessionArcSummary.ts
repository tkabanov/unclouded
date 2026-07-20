import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sanitizePromptField } from "../prompt/profileHelpers.ts";
import type { ProfileData } from "../prompt/types.ts";
import { estimatePromptTokens, shouldCompressContext } from "../tokenEstimate.ts";
import {
  readSessionMemoryRecords,
  truncateToMaxWords,
  type SessionMemoryRecord,
} from "./sessionMemoryHelpers.ts";

export const SESSION_ARC_SUMMARY_KEY = "session_arc_summary" as const;
export const SESSION_ARC_SOURCE_KEY = "session_arc_source_key" as const;
export const SESSION_ARC_UPDATED_AT_KEY = "session_arc_updated_at" as const;

/** Target ~200 tokens (~150 words). */
export const MAX_ARC_SUMMARY_WORDS = 150;

const ARC_SYSTEM_PROMPT =
  "You compress coaching session history into a single session arc summary (~200 tokens max). Capture: (1) major themes over the period, (2) the most significant insight the user reached, (3) the current open commitment if any, (4) behavioral patterns observed. Never identify individuals by name. Use plain prose only — no bullet lists, no JSON.";

export function readSessionArcSummary(
  onboardingData: Record<string, unknown> | null | undefined,
): string | null {
  const raw = onboardingData?.[SESSION_ARC_SUMMARY_KEY];
  if (typeof raw !== "string" || !raw.trim()) return null;
  return truncateToMaxWords(raw.trim(), MAX_ARC_SUMMARY_WORDS);
}

/** Sessions eligible for arc compression — all stored sessions except the most recent. */
export function getSessionsEligibleForArc(
  records: SessionMemoryRecord[],
): SessionMemoryRecord[] {
  if (records.length <= 1) return [];
  return records.slice(0, -1);
}

export function sessionArcSourceKey(records: SessionMemoryRecord[]): string {
  return getSessionsEligibleForArc(records)
    .map((record) => record.conversationId)
    .join("|");
}

export function needsSessionArcRegeneration(
  onboardingData: Record<string, unknown> | null | undefined,
  records: SessionMemoryRecord[],
): boolean {
  const eligible = getSessionsEligibleForArc(records);
  if (eligible.length === 0) return false;

  const storedKey = onboardingData?.[SESSION_ARC_SOURCE_KEY];
  const expectedKey = sessionArcSourceKey(records);
  if (storedKey !== expectedKey) return true;

  return !readSessionArcSummary(onboardingData);
}

export function formatSessionRecordForArcInput(record: SessionMemoryRecord): string {
  const parts = [
    `closedAt=${record.closedAt}`,
    `topic=${record.topic}`,
    `summary=${record.summaryStub}`,
  ];
  if (record.keyPatternOrInsight?.trim()) {
    parts.push(`insight=${record.keyPatternOrInsight}`);
  }
  if (record.microCommitment?.trim()) {
    parts.push(`commitment=${record.microCommitment}`);
  }
  if (record.resistancePoints?.trim()) {
    parts.push(`resistance=${record.resistancePoints}`);
  }
  if (record.coachingModeUsed?.trim()) {
    parts.push(`coachingMode=${record.coachingModeUsed}`);
  }
  if (record.effectivenessSignal?.trim()) {
    parts.push(`effectiveness=${record.effectivenessSignal}`);
  }
  return parts.join("\n");
}

export function buildArcSummaryUserPrompt(records: SessionMemoryRecord[]): string {
  const blocks = records.map(
    (record, index) => `--- Session ${index + 1} ---\n${formatSessionRecordForArcInput(record)}`,
  );
  return blocks.join("\n\n");
}

export function buildCompressedSessionMemorySectionLines(
  arcSummary: string,
  mostRecent: SessionMemoryRecord,
): string[] {
  const lines: string[] = [
    `Session arc summary (older sessions compressed; REQ-12): ${sanitizePromptField(arcSummary, 800)}`,
    "Most recent session (preserved in full):",
  ];

  const date = sanitizePromptField(mostRecent.closedAt, 40);
  const theme = sanitizePromptField(mostRecent.topic, 120);
  const insight =
    sanitizePromptField(mostRecent.keyPatternOrInsight ?? mostRecent.summaryStub, 320) ||
    "not recorded";
  const commitment =
    sanitizePromptField(mostRecent.microCommitment ?? "", 240) || "none";
  const status = mostRecent.microCommitment ? "open" : "none";

  lines.push(
    `Session ${date}: Theme — ${theme}. Insight — ${insight}. Commitment — ${commitment}. Status — ${status}.`,
  );

  const extras: string[] = [];
  if (mostRecent.summaryStub?.trim()) {
    extras.push(`summary=${sanitizePromptField(mostRecent.summaryStub, 400)}`);
  }
  if (mostRecent.emotionalStart?.trim()) {
    extras.push(`emotional-start=${sanitizePromptField(mostRecent.emotionalStart, 160)}`);
  }
  if (mostRecent.emotionalEnd?.trim()) {
    extras.push(`emotional-end=${sanitizePromptField(mostRecent.emotionalEnd, 160)}`);
  }
  if (mostRecent.resistancePoints?.trim()) {
    extras.push(`resistance=${sanitizePromptField(mostRecent.resistancePoints, 400)}`);
  }
  if (mostRecent.coachingModeUsed?.trim()) {
    extras.push(`coaching-mode=${sanitizePromptField(mostRecent.coachingModeUsed, 80)}`);
  }
  if (mostRecent.effectivenessSignal?.trim()) {
    extras.push(`effectiveness=${sanitizePromptField(mostRecent.effectivenessSignal, 160)}`);
  }
  if (extras.length > 0) {
    lines.push(`  (${extras.join("; ")})`);
  }

  return lines;
}

export async function generateSessionArcSummary(
  records: SessionMemoryRecord[],
  apiKey: string,
): Promise<string | null> {
  if (records.length === 0) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 280,
      messages: [
        { role: "system", content: ARC_SYSTEM_PROMPT },
        { role: "user", content: buildArcSummaryUserPrompt(records) },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) return null;

  return truncateToMaxWords(content.trim(), MAX_ARC_SUMMARY_WORDS);
}

export async function persistSessionArcSummary(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown>,
  arcSummary: string,
  records: SessionMemoryRecord[],
): Promise<Record<string, unknown>> {
  const nextOnboarding = {
    ...onboardingData,
    [SESSION_ARC_SUMMARY_KEY]: truncateToMaxWords(arcSummary, MAX_ARC_SUMMARY_WORDS),
    [SESSION_ARC_SOURCE_KEY]: sessionArcSourceKey(records),
    [SESSION_ARC_UPDATED_AT_KEY]: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .update({ onboardingData: nextOnboarding as never })
    .eq("id", userId);

  if (error) throw error;
  return nextOnboarding;
}

/**
 * REQ-12: when assembled system prompt exceeds the token budget, generate (or reuse)
 * a session arc summary and compress older session memory in the prompt.
 */
export async function applySessionMemoryCompressionIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  profileData: ProfileData,
  assembledSystemPrompt: string,
): Promise<boolean> {
  if (!shouldCompressContext(estimatePromptTokens(assembledSystemPrompt))) {
    return false;
  }

  const onboarding = profileData.onboardingData ?? {};
  const records = readSessionMemoryRecords(onboarding);
  const eligible = getSessionsEligibleForArc(records);
  if (eligible.length === 0) return false;

  let arc = readSessionArcSummary(onboarding);

  if (needsSessionArcRegeneration(onboarding, records)) {
    const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    if (!apiKey) return false;

    const generated = await generateSessionArcSummary(eligible, apiKey);
    if (!generated?.trim()) return false;

    profileData.onboardingData = await persistSessionArcSummary(
      supabase,
      userId,
      onboarding,
      generated,
      records,
    );
    arc = readSessionArcSummary(profileData.onboardingData);
  }

  if (!arc?.trim()) return false;

  profileData.liveContext = {
    ...(profileData.liveContext ?? {}),
    sessionMemoryCompressed: true,
  };
  return true;
}
