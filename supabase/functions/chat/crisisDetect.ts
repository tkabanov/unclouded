import type { UIMessage } from "npm:ai";
import type { ChatLiveContext } from "./prompt/types.ts";
import { CRISIS_RESPONSE_MANDATORY } from "./prompt/library.ts";

/** Prompt Library §10 mandatory hard-stop — returned verbatim by the edge (no stream). */
export const CRISIS_RESPONSE_TEXT = CRISIS_RESPONSE_MANDATORY;

/** FINAL Layer 1 crisis levels. L1 is prompt-only (no edge regex). L2+ triggers hard-stop. */
export type CrisisLevel = 2 | 3 | 4;

/** L3 — active suicidal ideation (direct/indirect intent to die or harm self). */
const L3_PATTERNS: RegExp[] = [
  /\bwant to die\b/i,
  /\bkill myself\b/i,
  /\bkilling myself\b/i,
  /\bend my life\b/i,
  /\bsuicidal\b/i,
  /\bhurt myself\b/i,
  /\bself[\s-]?harm\b/i,
];

/** L2 — significant distress (worthlessness, burden, withdrawal; self-harm thoughts without clear intent). */
const L2_PATTERNS: RegExp[] = [
  /\bcan'?t go on\b/i,
  /\bnot want to be here\b/i,
  /\bno reason to live\b/i,
  /\bthoughts of (hurting|killing) myself\b/i,
  /\bthinking about (killing|hurting) myself\b/i,
  /\bfeel(?:ing)? like a burden\b/i,
  /\bworthless\b/i,
];

/** L2 phrasing checked before L3 — "thinking about killing myself" is significant distress, not active intent. */
const L2_BEFORE_L3_PATTERNS: RegExp[] = [
  /\bthinking about (killing|hurting) myself\b/i,
  /\bthoughts of (hurting|killing) myself\b/i,
];

function hasL4ImminentDanger(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;

  if (/\b(going to|gonna)\s+(hurt|kill)\s+(myself|me)\b/i.test(normalized)) {
    if (
      /\b(tonight|today|right now|this (morning|evening|afternoon)|in an hour)\b/i.test(normalized) ||
      /\b(have\s+(the\s+)?means|right here)\b/i.test(normalized)
    ) {
      return true;
    }
  }

  if (/\b(hurt|kill)\s+myself\s+(tonight|today|now|right now)\b/i.test(normalized)) {
    return true;
  }

  const hasPlan = /\b(have\s+a\s+plan|specific\s+plan|made\s+a\s+plan)\b/i.test(normalized);
  const hasMeans = /\b(have\s+(the\s+)?means|right here)\b/i.test(normalized);
  const hasImminentTimeline = /\b(tonight|today|right now|this (morning|evening|afternoon))\b/i.test(
    normalized,
  );

  return hasPlan && (hasMeans || hasImminentTimeline);
}

/**
 * Classify crisis severity from user text (FINAL L2–L4).
 * L1 distress has no edge regex — Kota handles it via Layer 1 prompt only.
 */
export function classifyCrisisLevel(text: string): CrisisLevel | null {
  const normalized = text.trim();
  if (!normalized) return null;

  if (hasL4ImminentDanger(normalized)) return 4;
  if (L2_BEFORE_L3_PATTERNS.some((pattern) => pattern.test(normalized))) return 2;
  if (L3_PATTERNS.some((pattern) => pattern.test(normalized))) return 3;
  if (L2_PATTERNS.some((pattern) => pattern.test(normalized))) return 2;

  return null;
}

/** L2+ regex matches always hard-stop with the single mandatory 988/741741 response (not L4 911 prompt text). */
export function requiresCrisisHardStop(level: CrisisLevel | null): level is CrisisLevel {
  return level !== null && level >= 2;
}

export function detectCrisisLanguage(text: string): boolean {
  return requiresCrisisHardStop(classifyCrisisLevel(text));
}

function extractTextFromUiMessage(message: UIMessage): string {
  const parts = message.parts ?? [];
  return parts
    .map((part) => {
      if (part.type === "text" && typeof part.text === "string") return part.text;
      return "";
    })
    .join("\n")
    .trim();
}

export function extractLatestUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const text = extractTextFromUiMessage(message);
    if (text && text !== "[SESSION START]") return text;
  }
  return "";
}

export function extractAllUserTexts(messages: UIMessage[]): string[] {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => extractTextFromUiMessage(message))
    .filter((text) => text && text !== "[SESSION START]");
}

function roleTranscriptLabel(role: UIMessage["role"]): string | null {
  if (role === "user") return "User";
  if (role === "assistant") return "Kota";
  return null;
}

/** Full session transcript for memory extraction (User + Kota turns). */
export function buildSessionTranscript(messages: UIMessage[]): string {
  const turns: string[] = [];

  for (const message of messages) {
    const label = roleTranscriptLabel(message.role);
    if (!label) continue;

    const text = extractTextFromUiMessage(message);
    if (!text || text === "[SESSION START]") continue;

    turns.push(`${label}: ${text}`);
  }

  return turns.join("\n\n");
}

function maxCrisisLevel(levels: Array<CrisisLevel | null>): CrisisLevel | null {
  let highest: CrisisLevel | null = null;
  for (const level of levels) {
    if (level === null) continue;
    if (highest === null || level > highest) highest = level;
  }
  return highest;
}

export function classifyCrisisInTexts(texts: string[]): CrisisLevel | null {
  return maxCrisisLevel(texts.map((text) => classifyCrisisLevel(text)));
}

export function classifyCrisisInThread(
  messages: UIMessage[],
  extraText?: string,
): CrisisLevel | null {
  const segments = [...extractAllUserTexts(messages)];
  if (extraText?.trim()) segments.push(extraText.trim());
  return classifyCrisisInTexts(segments);
}

export function detectCrisisInThread(
  messages: UIMessage[],
  extraText?: string,
): boolean {
  return requiresCrisisHardStop(classifyCrisisInThread(messages, extraText));
}

function liveContextTextSegments(liveContext?: ChatLiveContext | null): string[] {
  if (!liveContext) return [];
  const segments: string[] = [];
  const checkIn = liveContext.latestCheckIn;
  if (checkIn?.feeling && typeof checkIn.feeling === "string") {
    segments.push(checkIn.feeling);
  }
  if (checkIn?.microCommitmentStatus && typeof checkIn.microCommitmentStatus === "string") {
    segments.push(checkIn.microCommitmentStatus);
  }
  if (liveContext.activeMicroCommitment && typeof liveContext.activeMicroCommitment === "string") {
    segments.push(liveContext.activeMicroCommitment);
  }
  for (const reflection of liveContext.pathReflections ?? []) {
    if (reflection.answerText) segments.push(reflection.answerText);
    if (reflection.questionText) segments.push(reflection.questionText);
  }
  return segments;
}

export function classifyCrisisInLiveContext(
  liveContext?: ChatLiveContext | null,
): CrisisLevel | null {
  return classifyCrisisInTexts(liveContextTextSegments(liveContext));
}

export function detectCrisisInLiveContext(liveContext?: ChatLiveContext | null): boolean {
  return requiresCrisisHardStop(classifyCrisisInLiveContext(liveContext));
}
