import { sanitizePromptField } from "../prompt/profileHelpers.ts";
import type { ChatReassessmentContext } from "../prompt/types.ts";
import type { SessionMemoryRecord } from "./sessionMemoryHelpers.ts";

export const MAX_UNRESOLVED_THREAD_LINES = 3;

export function formatUnresolvedThreadDate(isoDate: string): string {
  const trimmed = isoDate.trim();
  if (!trimmed) return "prior session";
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return trimmed.slice(0, 10) || "prior session";
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

export function formatUnresolvedThreadLine(dateLabel: string, description: string): string {
  return `Unresolved from ${sanitizePromptField(dateLabel, 40)}: ${sanitizePromptField(description, 400)}.`;
}

export function collectSessionUnresolvedThreadLines(
  records: SessionMemoryRecord[],
  maxLines = MAX_UNRESOLVED_THREAD_LINES,
): string[] {
  const lines: string[] = [];

  for (const record of [...records].reverse()) {
    if (!record.unresolvedThread?.trim()) continue;
    lines.push(
      formatUnresolvedThreadLine(
        formatUnresolvedThreadDate(record.closedAt),
        record.unresolvedThread,
      ),
    );
    if (lines.length >= maxLines) break;
  }

  return lines;
}

export function collectReassessmentUnresolvedThreadLine(
  reassessment: ChatReassessmentContext,
): string | null {
  if (!reassessment.reflectionQ2?.trim()) return null;

  const dateLabel = reassessment.assessmentDate?.trim()
    ? formatUnresolvedThreadDate(reassessment.assessmentDate)
    : "reassessment";

  return formatUnresolvedThreadLine(dateLabel, reassessment.reflectionQ2);
}

export function buildUnresolvedThreadsSectionLines(input: {
  sessionRecords: SessionMemoryRecord[];
  latestReassessment?: ChatReassessmentContext | null;
}): string[] {
  const threads = collectSessionUnresolvedThreadLines(input.sessionRecords);
  const reassessmentThread = input.latestReassessment
    ? collectReassessmentUnresolvedThreadLine(input.latestReassessment)
    : null;

  if (reassessmentThread && !threads.includes(reassessmentThread)) {
    threads.push(reassessmentThread);
  }

  return threads.length > 0 ? threads.slice(0, MAX_UNRESOLVED_THREAD_LINES + 1) : ["None flagged."];
}
