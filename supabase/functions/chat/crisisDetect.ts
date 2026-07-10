import type { UIMessage } from "npm:ai";
import type { ChatLiveContext } from "./prompt/types.ts";

/** Build Brief §11 crisis protocol — fixed response; no continued coaching. */
export const CRISIS_RESPONSE_TEXT =
  "It sounds like you're carrying something really heavy right now. Please reach out for support immediately: Call or text 988 (Suicide & Crisis Lifeline) — available 24/7. Text HOME to 741741 (Crisis Text Line). Gidget is coaching only and can't provide crisis care. Please reach out now.";

const CRISIS_PATTERNS: RegExp[] = [
  /\bwant to die\b/i,
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bsuicidal\b/i,
  /\bcan'?t go on\b/i,
  /\bhurt myself\b/i,
  /\bself[\s-]?harm\b/i,
  /\bnot want to be here\b/i,
  /\bno reason to live\b/i,
];

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

export function detectCrisisLanguage(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function extractAllUserTexts(messages: UIMessage[]): string[] {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => extractTextFromUiMessage(message))
    .filter((text) => text && text !== "[SESSION START]");
}

export function detectCrisisInThread(
  messages: UIMessage[],
  extraText?: string,
): boolean {
  const segments = [...extractAllUserTexts(messages)];
  if (extraText?.trim()) segments.push(extraText.trim());
  return segments.some((text) => detectCrisisLanguage(text));
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

export function detectCrisisInLiveContext(liveContext?: ChatLiveContext | null): boolean {
  return liveContextTextSegments(liveContext).some((text) => detectCrisisLanguage(text));
}
