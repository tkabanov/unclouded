/** Prompt 6 — Pre-Coaching Brief — Kota's Read (AI Prompt Specifications). */

import { DAILY_CHECKINS_ONBOARDING_KEY } from "../chat/liveContext/liveContextHelpers.ts";
import {
  readCommitmentCheckInsFromOnboarding,
  resolveActiveCommitmentStatus,
  resolveSessionMemoryCommitmentStatus,
} from "../chat/sessionMemory/commitmentFollowThrough.ts";
import type { SessionMemoryRecord } from "../chat/sessionMemory/sessionMemoryHelpers.ts";

export const KOTA_READ_SESSION_WINDOW_DAYS = 90;

export type KotaReadBrief = {
  patterns_observed: string;
  not_yet_reached: string;
  be_careful_about: string;
  most_important_now: string;
  confidence_note: string;
};

export type KotaReadContext = {
  classification: string;
  coachingMode: string;
  sessionCount: number;
  aiConfidenceLevel: string;
  confirmedFingerprintSignals: string;
  sessionMemoryCompressed: string;
  activeFlags: string;
  commitmentFollowThroughRate: string;
  openCommitment: string;
  /** Optional factual lines still useful for grounding. */
  firstName?: string;
  scoresLine?: string;
  pathsLine?: string;
  lastSessionDate?: string;
};

export type FactualBriefInput = {
  classification: string;
  scoresLine: string;
  coachingMode: string;
  pathsLine: string;
  openCommitment: string;
  activeFlags: string;
  sessionCount: number;
  lastSessionDate: string;
};

export const KOTA_READ_SYSTEM_PROMPT =
  "You are Kota — the AI coaching presence inside Uncloud360. A user has booked a session with a human PuP coach. You are generating Kota's Read — the section of the pre-session brief that gives the coach your actual observations about this person. This is not a data summary — the coach already has the data. This is what you have noticed that the data alone does not show. Tone: direct, professional, written coach-to-coach. Return JSON only.";

export const KOTA_READ_JSON_INSTRUCTIONS = `Return JSON with this exact shape:
{
  "patterns_observed": "[bullet-point formatted text — use \\n between bullets]",
  "not_yet_reached": "[1–2 sentences]",
  "be_careful_about": "[1–2 sentences]",
  "most_important_now": "[1–2 sentences]",
  "confidence_note": "[one sentence noting the ai_confidence_level and session count context]"
}

COMPONENT 1 — PATTERNS I'VE OBSERVED (2–4 bullet points)
Precise behavioral and engagement patterns. If fewer than 5 sessions completed, note observations are provisional.
COMPONENT 2 — WHAT I HAVEN'T BEEN ABLE TO GET TO (1–2 sentences)
COMPONENT 3 — ONE THING TO BE CAREFUL ABOUT (1–2 sentences)
COMPONENT 4 — WHAT I THINK IS MOST IMPORTANT RIGHT NOW (1–2 sentences)

WHAT THIS BRIEF IS NOT
Not a diagnosis. Not clinical language. Not a prediction. Nothing speculative without being labeled as such.`;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseKotaReadBrief(raw: unknown): KotaReadBrief | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  const patterns_observed = readString(row.patterns_observed);
  const not_yet_reached = readString(row.not_yet_reached);
  const be_careful_about = readString(row.be_careful_about);
  const most_important_now = readString(row.most_important_now);
  const confidence_note = readString(row.confidence_note);

  if (
    !patterns_observed ||
    !not_yet_reached ||
    !be_careful_about ||
    !most_important_now ||
    !confidence_note
  ) {
    return null;
  }

  return {
    patterns_observed,
    not_yet_reached,
    be_careful_about,
    most_important_now,
    confidence_note,
  };
}

/** Render Prompt 6 structured brief for coachBooking.kotaRead storage. */
export function formatKotaReadBrief(brief: KotaReadBrief): string {
  return [
    "KOTA'S READ — Coach handoff brief",
    "",
    "Patterns I've observed",
    brief.patterns_observed.trim(),
    "",
    "What I haven't been able to get to",
    brief.not_yet_reached.trim(),
    "",
    "One thing to be careful about",
    brief.be_careful_about.trim(),
    "",
    "What I think is most important right now",
    brief.most_important_now.trim(),
    "",
    "Confidence note",
    brief.confidence_note.trim(),
  ].join("\n").trim();
}

/**
 * Factual pre-session section (no AI) — classification, scores, mode, paths,
 * open commitment, flags, session count / last session date.
 */
export function formatFactualBriefSection(input: FactualBriefInput): string {
  const scoresLine = input.scoresLine.trim() || "Scores: not recorded";
  const pathsLine = input.pathsLine.trim() || "Active paths: none recorded";
  const openCommitment = input.openCommitment.trim()
    ? input.openCommitment.trim().startsWith("Open commitment:")
      ? input.openCommitment.trim()
      : `Open commitment: ${input.openCommitment.trim()}`
    : "Open commitment: none recorded";

  return [
    "FACTUAL DATA",
    "",
    `Classification: ${input.classification.trim() || "not recorded"}`,
    scoresLine.startsWith("Scores") ? scoresLine : `Scores: ${scoresLine}`,
    `Coaching mode: ${input.coachingMode.trim() || "not recorded"}`,
    pathsLine.startsWith("Active paths") ? pathsLine : `Active paths: ${pathsLine}`,
    openCommitment,
    `Active flags: ${input.activeFlags.trim() || "none"}`,
    `Sessions completed: ${input.sessionCount}`,
    `Last session date: ${input.lastSessionDate.trim() || "not recorded"}`,
  ].join("\n");
}

/** Full coach brief document: factual (no AI) + Kota's Read (AI). */
export function formatFullCoachBrief(factualSection: string, kotaRead: string): string {
  return [factualSection.trim(), "", kotaRead.trim()].filter(Boolean).join("\n").trim();
}

export function resolveLastSessionDate(
  records: Array<{ closedAt: string }>,
): string {
  let latestMs = -Infinity;
  let latestIso: string | null = null;
  for (const record of records) {
    const ms = Date.parse(record.closedAt);
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
      latestIso = record.closedAt;
    }
  }
  if (!latestIso) return "not recorded";
  const parsed = new Date(latestIso);
  if (!Number.isFinite(parsed.getTime())) return "not recorded";
  return parsed.toISOString().slice(0, 10);
}

/** Build factual section from Prompt 6 context fields. */
export function formatFactualBriefFromContext(context: KotaReadContext): string {
  return formatFactualBriefSection({
    classification: context.classification,
    scoresLine: context.scoresLine?.trim() || "Scores: not recorded",
    coachingMode: context.coachingMode,
    pathsLine: context.pathsLine?.trim() || "Active paths: none recorded",
    openCommitment: context.openCommitment,
    activeFlags: context.activeFlags,
    sessionCount: context.sessionCount,
    lastSessionDate: context.lastSessionDate?.trim() || "not recorded",
  });
}

export function buildKotaReadUserPrompt(context: KotaReadContext): string {
  return [
    KOTA_READ_JSON_INSTRUCTIONS,
    "",
    "USER DATA",
    `Classification: ${context.classification}`,
    `Coaching mode: ${context.coachingMode}`,
    `Sessions completed: ${context.sessionCount}`,
    `AI confidence level: ${context.aiConfidenceLevel}`,
    `Confirmed fingerprint signals: ${context.confirmedFingerprintSignals}`,
    `Session themes (compressed): ${context.sessionMemoryCompressed}`,
    `Active flags: ${context.activeFlags}`,
    `Commitment follow-through rate: ${context.commitmentFollowThroughRate}`,
    `Current open commitment: ${context.openCommitment}`,
    context.scoresLine ? context.scoresLine : "",
    context.pathsLine ? context.pathsLine : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildClassificationLine(results: Record<string, unknown> | null): string {
  if (!results) return "Classification: not recorded";
  const classification = results.classification;
  if (classification && typeof classification === "object") {
    const name = readString((classification as Record<string, unknown>).name);
    if (name) return `Classification: ${name}`;
  }
  const fallback = readString(results.classification);
  return fallback ? `Classification: ${fallback}` : "Classification: not recorded";
}

export function buildScoresLine(results: Record<string, unknown> | null): string {
  if (!results) return "Scores: not recorded";
  const stability = results.stability_score;
  const performance = results.performance_score;
  const alignment = results.alignment_score;
  if (
    typeof stability !== "number" ||
    typeof performance !== "number" ||
    typeof alignment !== "number"
  ) {
    return "Scores: not recorded";
  }
  return `Scores — Stability ${stability.toFixed(1)}, Performance ${performance.toFixed(1)}, Alignment ${alignment.toFixed(1)}`;
}

export function filterSessionMemoryForKotaRead(
  records: SessionMemoryRecord[],
  referenceDate: Date = new Date(),
  windowDays: number = KOTA_READ_SESSION_WINDOW_DAYS,
): SessionMemoryRecord[] {
  const cutoffMs = referenceDate.getTime() - windowDays * 24 * 60 * 60 * 1000;
  return records.filter((record) => {
    const closedMs = Date.parse(record.closedAt);
    return Number.isFinite(closedMs) && closedMs >= cutoffMs;
  });
}

function readActiveMicroCommitment(
  onboardingData: Record<string, unknown> | null,
): string | null {
  if (!onboardingData) return null;
  const keys = ["micro_commitment_active_text", "micro_commitment_active", "activeMicroCommitment"];
  for (const key of keys) {
    const value = onboardingData[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readLatestCheckinCommitmentStatus(
  onboardingData: Record<string, unknown> | null,
): string | null {
  if (!onboardingData) return null;
  const raw = onboardingData[DAILY_CHECKINS_ONBOARDING_KEY];
  if (!Array.isArray(raw) || raw.length === 0) return null;

  for (const entry of [...raw].reverse()) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const status =
      typeof row.microCommitmentStatus === "string"
        ? row.microCommitmentStatus
        : typeof row.micro_commitment_status === "string"
          ? row.micro_commitment_status
          : null;
    if (status?.trim()) return status.trim();
  }
  return null;
}

export function sessionMemoryToLines(
  records: Array<{
    topic: string;
    summaryStub: string;
    microCommitment?: string | null;
    keyPatternOrInsight?: string | null;
    closedAt: string;
  }>,
): string[] {
  return records.map((record) => {
    const parts = [`- ${record.topic}: ${record.summaryStub}`];
    if (record.microCommitment?.trim()) {
      parts.push(`  Commitment: ${record.microCommitment.trim()}`);
    }
    if (record.keyPatternOrInsight?.trim()) {
      parts.push(`  Pattern/insight: ${record.keyPatternOrInsight.trim()}`);
    }
    parts.push(`  Closed: ${record.closedAt}`);
    return parts.join("\n");
  });
}

export function resolveOpenCommitmentLine(
  sessionRecords: SessionMemoryRecord[],
  onboardingData: Record<string, unknown> | null,
  now: Date = new Date(),
): string {
  const checkIns = readCommitmentCheckInsFromOnboarding(onboardingData);
  const activeMicroCommitment = readActiveMicroCommitment(onboardingData);
  const latestCheckInStatus = readLatestCheckinCommitmentStatus(onboardingData);

  for (let index = sessionRecords.length - 1; index >= 0; index -= 1) {
    const record = sessionRecords[index];
    if (!record.microCommitment?.trim()) continue;
    const status = resolveSessionMemoryCommitmentStatus(record, {
      allRecords: sessionRecords,
      checkIns,
      activeMicroCommitment,
      latestCheckInStatus,
      now,
    });
    if (status === "open") {
      return `Open commitment: ${record.microCommitment.trim()}`;
    }
  }

  const activeStatus = resolveActiveCommitmentStatus({
    records: sessionRecords,
    checkIns,
    activeMicroCommitment,
    latestCheckInStatus,
    now,
  });
  if (activeStatus === "open" && activeMicroCommitment) {
    return `Open commitment: ${activeMicroCommitment}`;
  }

  return "Open commitment: none recorded";
}

export function buildPathsLine(
  enrollments: Array<{ pathName: string; status: string; completedSessionsCount: number }>,
): string {
  if (enrollments.length === 0) return "Active paths: none recorded";
  return `Active paths: ${enrollments
    .map(
      (entry) =>
        `${entry.pathName} (${entry.status}, ${entry.completedSessionsCount} sessions completed)`,
    )
    .join("; ")}`;
}

/** @deprecated — kept for older test fixtures; prefer formatKotaReadBrief. */
export function formatPatternLine(pattern: {
  pattern: string;
  trigger: string;
  approachTried: string;
  result: string;
}): string {
  return `This user tends to ${pattern.pattern}. It shows up when ${pattern.trigger}. Kota has tried ${pattern.approachTried} with ${pattern.result}.`;
}
