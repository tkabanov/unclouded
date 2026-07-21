import type { SessionMemoryRecord } from "../../../../supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts";

export type CoachingSessionArchiveRow = {
  userId: string;
  finalizedAt: string;
  exchangeCount?: number | null;
  classificationAtSession?: string | null;
  loadSignalsSnapshot?: Record<string, unknown> | null;
  summaryJson?: Record<string, unknown> | null;
};

export function archiveRowToSessionMemoryRecord(row: CoachingSessionArchiveRow): SessionMemoryRecord {
  const summary = row.summaryJson ?? {};
  const topic =
    typeof summary.lastSessionTopic === "string"
      ? summary.lastSessionTopic
      : typeof summary.userText === "string"
        ? summary.userText
        : "Session";
  const summaryStub =
    typeof summary.summaryStub === "string"
      ? summary.summaryStub
      : typeof summary.kotaReply === "string"
        ? summary.kotaReply
        : topic;

  return {
    conversationId: row.userId,
    closedAt: row.finalizedAt,
    topic,
    summaryStub,
    microCommitment:
      typeof summary.microCommitmentText === "string" ? summary.microCommitmentText : null,
    microCommitmentDue:
      typeof summary.microCommitmentDue === "string" ? summary.microCommitmentDue : null,
    keyPatternOrInsight:
      typeof summary.keyPatternOrInsight === "string" ? summary.keyPatternOrInsight : null,
    emotionalStart: typeof summary.emotionalStart === "string" ? summary.emotionalStart : null,
    emotionalEnd: typeof summary.emotionalEnd === "string" ? summary.emotionalEnd : null,
    resistancePoints:
      typeof summary.resistancePoints === "string" ? summary.resistancePoints : null,
    coachingModeUsed: null,
    effectivenessSignal:
      typeof summary.effectivenessSignal === "string" ? summary.effectivenessSignal : null,
    exchangeCount: row.exchangeCount ?? null,
    unresolvedThread:
      typeof summary.unresolvedThread === "string" ? summary.unresolvedThread : null,
    commitmentStatus:
      typeof summary.commitmentStatus === "string" ? summary.commitmentStatus : null,
  };
}

export function groupArchiveRowsByUser(
  rows: CoachingSessionArchiveRow[],
): Map<string, SessionMemoryRecord[]> {
  const grouped = new Map<string, SessionMemoryRecord[]>();
  for (const row of rows) {
    const records = grouped.get(row.userId) ?? [];
    records.push(archiveRowToSessionMemoryRecord(row));
    grouped.set(row.userId, records);
  }

  for (const [userId, records] of grouped.entries()) {
    grouped.set(
      userId,
      records.sort((left, right) => Date.parse(left.closedAt) - Date.parse(right.closedAt)),
    );
  }

  return grouped;
}

export function buildSessionArchiveCsv(rows: CoachingSessionArchiveRow[]): string {
  const header = [
    "userId",
    "finalizedAt",
    "exchangeCount",
    "classificationAtSession",
    "topic",
    "summaryStub",
  ].join(",");

  const lines = rows.map((row) => {
    const record = archiveRowToSessionMemoryRecord(row);
    return [
      row.userId,
      row.finalizedAt,
      row.exchangeCount ?? "",
      row.classificationAtSession ?? "",
      JSON.stringify(record.topic),
      JSON.stringify(record.summaryStub),
    ].join(",");
  });

  return [header, ...lines].join("\n");
}
