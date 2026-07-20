import { DAILY_CHECKINS_ONBOARDING_KEY } from "../liveContext/liveContextHelpers.ts";
import type { SessionMemoryRecord } from "./sessionMemoryHelpers.ts";

export type Layer10CommitmentStatus = "none" | "open" | "completed" | "missed";

export type CommitmentCheckInSnapshot = {
  date: string;
  microCommitmentStatus?: string | null;
};

export function toCommitmentDateKey(isoDate: string): string {
  const trimmed = isoDate.trim();
  if (!trimmed) return "";
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return trimmed.slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
}

/** Map daily check-in answers to Layer 10 open / completed / missed. */
export function normalizeCheckInCommitmentStatus(
  raw: string | null | undefined,
): Exclude<Layer10CommitmentStatus, "none"> | null {
  if (!raw?.trim()) return null;

  const normalized = raw.trim().toLowerCase();

  if (
    /^(yes|done|completed|partially|partial|followed|kept)\b/.test(normalized) ||
    normalized.includes("followed through") ||
    normalized.includes("did it")
  ) {
    return "completed";
  }

  if (
    /^(no|missed|forgot|failed)\b/.test(normalized) ||
    normalized.includes("did not") ||
    normalized.includes("didn't") ||
    normalized.includes("not yet") ||
    normalized.includes("no judgment") ||
    /\bforgot\b/.test(normalized)
  ) {
    return "missed";
  }

  if (/^open\b/.test(normalized)) {
    return "open";
  }

  return null;
}

export function normalizeLayer10CommitmentStatus(
  raw: string | null | undefined,
): Layer10CommitmentStatus | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "none") return "none";
  if (normalized === "open") return "open";
  if (normalized === "completed") return "completed";
  if (normalized === "missed") return "missed";
  return normalizeCheckInCommitmentStatus(raw);
}

export function readCommitmentCheckInsFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): CommitmentCheckInSnapshot[] {
  const raw = onboardingData?.[DAILY_CHECKINS_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const date = typeof row.date === "string" ? row.date : "";
      const microCommitmentStatus =
        typeof row.microCommitmentStatus === "string"
          ? row.microCommitmentStatus
          : typeof row.micro_commitment_status === "string"
            ? row.micro_commitment_status
            : null;
      if (!date) return null;
      return { date, microCommitmentStatus };
    })
    .filter((entry): entry is CommitmentCheckInSnapshot => entry !== null)
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date));
}

function followUpCheckInsForSession(
  record: SessionMemoryRecord,
  checkIns: CommitmentCheckInSnapshot[],
): CommitmentCheckInSnapshot[] {
  const closedDateKey = toCommitmentDateKey(record.closedAt);
  if (!closedDateKey) return [];

  return checkIns.filter((checkIn) => {
    if (!checkIn.microCommitmentStatus?.trim()) return false;
    return toCommitmentDateKey(checkIn.date) >= closedDateKey;
  });
}

function hasLaterSessionRecord(
  records: SessionMemoryRecord[],
  record: SessionMemoryRecord,
): boolean {
  const index = records.findIndex(
    (candidate) => candidate.conversationId === record.conversationId,
  );
  return index >= 0 && index < records.length - 1;
}

export function resolveSessionMemoryCommitmentStatus(
  record: SessionMemoryRecord,
  options: {
    allRecords: SessionMemoryRecord[];
    checkIns: CommitmentCheckInSnapshot[];
    activeMicroCommitment?: string | null;
    latestCheckInStatus?: string | null;
    now?: Date;
  },
): Layer10CommitmentStatus {
  if (!record.microCommitment?.trim()) return "none";

  const stored = normalizeLayer10CommitmentStatus(record.commitmentStatus ?? null);
  if (stored === "completed" || stored === "missed") return stored;

  for (const checkIn of followUpCheckInsForSession(record, options.checkIns)) {
    const normalized = normalizeCheckInCommitmentStatus(checkIn.microCommitmentStatus);
    if (normalized === "completed" || normalized === "missed") {
      return normalized;
    }
  }

  const activeCommitment = options.activeMicroCommitment?.trim() ?? "";
  const isStillActive = activeCommitment.length > 0 && activeCommitment === record.microCommitment.trim();

  if (isStillActive && options.latestCheckInStatus) {
    const fromLatest = normalizeCheckInCommitmentStatus(options.latestCheckInStatus);
    if (fromLatest) return fromLatest;
  }

  const dueDateKey = record.microCommitmentDue ? toCommitmentDateKey(record.microCommitmentDue) : "";
  const todayKey = toCommitmentDateKey((options.now ?? new Date()).toISOString());

  if (
    dueDateKey &&
    todayKey > dueDateKey &&
    followUpCheckInsForSession(record, options.checkIns).length === 0
  ) {
    return "missed";
  }

  if (
    !isStillActive &&
    hasLaterSessionRecord(options.allRecords, record) &&
    followUpCheckInsForSession(record, options.checkIns).length === 0
  ) {
    return "missed";
  }

  return "open";
}

export function resolveActiveCommitmentStatus(options: {
  records: SessionMemoryRecord[];
  checkIns: CommitmentCheckInSnapshot[];
  activeMicroCommitment?: string | null;
  latestCheckInStatus?: string | null;
  now?: Date;
}): Layer10CommitmentStatus {
  const activeCommitment = options.activeMicroCommitment?.trim();
  if (!activeCommitment) return "none";

  const sourceRecord = [...options.records].reverse().find(
    (record) => record.microCommitment?.trim() === activeCommitment,
  );
  if (!sourceRecord) {
    const fromLatest = normalizeCheckInCommitmentStatus(options.latestCheckInStatus);
    return fromLatest ?? "open";
  }

  return resolveSessionMemoryCommitmentStatus(sourceRecord, {
    allRecords: options.records,
    checkIns: options.checkIns,
    activeMicroCommitment: activeCommitment,
    latestCheckInStatus: options.latestCheckInStatus,
    now: options.now,
  });
}

export function formatLayer10CommitmentStatus(status: Layer10CommitmentStatus): string {
  return status;
}
