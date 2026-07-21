/**
 * REQ-16 — Post-launch prompt library review signals for admin analytics.
 * Primary source: coachingSessionArchive (unbounded). Legacy JSON memory fallback for pre-archive users.
 */

import { supabase } from "@/integrations/supabase/client";
import { DAILY_CHECKINS_ONBOARDING_KEY } from "@/lib/dashboard/checkinApi";
import {
  getLoadSignalAnswerMeta,
  LOAD_SIGNAL_QUESTIONS,
} from "@/lib/enums/onboardingQuestions";
import {
  groupArchiveRowsByUser,
  buildSessionArchiveCsv,
  type CoachingSessionArchiveRow,
} from "@/lib/admin/coachingSessionArchiveAnalyticsHelpers";
import {
  readSessionMemoryRecords,
  type SessionMemoryRecord,
} from "../../../../supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts";

export const PROMPT_REVIEW_PROFILE_SELECT =
  "id, classification, onboardingData, createdAt" as const;

export const PROMPT_REVIEW_ARCHIVE_SELECT =
  "userId, finalizedAt, exchangeCount, classificationAtSession, loadSignalsSnapshot, summaryJson" as const;

export const PROMPT_REVIEW_CADENCE =
  "Formal prompt library review at 6, 12, and 18 months post-launch (2-day Dr. Sam review)." as const;

export const PROMPT_REVIEW_CADENCE_CHECKLIST = [
  "6 months — classification engagement + exchange distribution",
  "12 months — commitment follow-through by category",
  "18 months — load-signal disengagement cohorts + export CSV for Dr. Sam",
] as const;

/** REQ-16 — archive is primary; JSON cap remains for Layer 10 prompt only. */
export const PROMPT_REVIEW_DATA_LIMITATION =
  "Signals are sourced from coachingSessionArchive (full finalized history). Users without archive rows fall back to profiles.onboardingData chat_session_memory (≤5 sessions). Export CSV below for formal 6/12/18-month reviews." as const;

const CONTINUED_ENGAGEMENT_WINDOW_DAYS = 30;
const DISENGAGEMENT_THRESHOLD_DAYS = 14;
const EXCHANGE_BUCKETS = [
  { label: "1–5 (orientation)", min: 1, max: 5 },
  { label: "6–12 (depth)", min: 6, max: 12 },
  { label: "13+ (synthesis/close)", min: 13, max: null },
] as const;

export type PromptReviewProfileRow = {
  id?: string | null;
  classification?: string | null;
  onboardingData?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export type ClassificationEngagementRow = {
  classification: string;
  userCount: number;
  avgSessionsPerUser: number;
  continuedEngagementRate: number | null;
};

export type ExchangeCountBucketRow = {
  label: string;
  sessionCount: number;
  sampleThemes: string[];
};

export type CommitmentCategoryRow = {
  category: string;
  tracked: number;
  followed: number;
  followThroughRate: number | null;
};

export type LoadSignalDisengagementRow = {
  loadCombination: string;
  userCount: number;
  disengagedCount: number;
  disengagementRate: number | null;
};

export type PromptReviewSignals = {
  profilesAnalyzed: number;
  sessionsAnalyzed: number;
  archivedSessions: number;
  legacyMemorySessions: number;
  classificationEngagement: ClassificationEngagementRow[];
  exchangeCountDistribution: ExchangeCountBucketRow[];
  peakExchangeBucket: string | null;
  averageExchangeCount: number | null;
  commitmentFollowThroughRate: number | null;
  commitmentByCategory: CommitmentCategoryRow[];
  loadSignalDisengagement: LoadSignalDisengagementRow[];
  reviewCadence: string;
  dataLimitation: string;
};

function readClassification(row: PromptReviewProfileRow): string {
  const raw = row.classification?.trim();
  return raw || "unknown";
}

function readLoadSignals(
  onboardingData: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const raw = onboardingData?.loadSignals;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

function daysBetween(fromIso: string, toDate: Date): number | null {
  const parsed = Date.parse(fromIso);
  if (Number.isNaN(parsed)) return null;
  return Math.floor((toDate.getTime() - parsed) / (1000 * 60 * 60 * 24));
}

function latestSessionClosedAt(records: SessionMemoryRecord[]): string | null {
  let latest: string | null = null;
  for (const record of records) {
    if (!record.closedAt) continue;
    if (!latest || Date.parse(record.closedAt) > Date.parse(latest)) {
      latest = record.closedAt;
    }
  }
  return latest;
}

function userHasContinuedEngagement(records: SessionMemoryRecord[], now: Date): boolean {
  if (records.length >= 2) return true;
  const lastClosed = latestSessionClosedAt(records);
  if (!lastClosed) return false;
  const days = daysBetween(lastClosed, now);
  return days !== null && days <= CONTINUED_ENGAGEMENT_WINDOW_DAYS;
}

function userIsDisengaged(records: SessionMemoryRecord[], now: Date): boolean {
  if (records.length === 0) return true;
  const lastClosed = latestSessionClosedAt(records);
  if (!lastClosed) return true;
  const days = daysBetween(lastClosed, now);
  return days === null || days >= DISENGAGEMENT_THRESHOLD_DAYS;
}

function resolveHighLoadCombination(loadSignals: Record<string, string>): string {
  const highTypes = new Set<string>();
  for (const question of LOAD_SIGNAL_QUESTIONS) {
    const slug = loadSignals[question.field];
    if (!slug) continue;
    const meta = getLoadSignalAnswerMeta(slug);
    if (meta?.intensity === "high") {
      highTypes.add(meta.loadType);
    }
  }

  if (highTypes.size === 0) return "no high load signals";
  return [...highTypes].sort().join(" + ");
}

function commitmentLooksFollowed(
  record: SessionMemoryRecord,
  recentCheckinStatus: string | null,
): boolean {
  const signal = (record.effectivenessSignal ?? "").toLowerCase();
  if (
    signal.includes("kept") ||
    signal.includes("followed") ||
    signal.includes("done") ||
    signal.includes("completed")
  ) {
    return true;
  }

  if (!recentCheckinStatus) return false;
  const normalized = recentCheckinStatus.toLowerCase();
  return (
    normalized.includes("yes") ||
    normalized.includes("done") ||
    normalized.includes("partial")
  );
}

function readLatestCheckinCommitmentStatus(
  onboardingData: Record<string, unknown> | null | undefined,
): string | null {
  const raw = onboardingData?.[DAILY_CHECKINS_ONBOARDING_KEY];
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

function categorizeCommitment(text: string): string {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return "unspecified";
  if (/(walk|move|exercise|stretch|gym|steps)/.test(normalized)) return "movement";
  if (/(write|journal|letter|note)/.test(normalized)) return "writing";
  if (/(talk|tell|call|reach out|connect|friend|partner)/.test(normalized)) {
    return "connection";
  }
  if (/(sleep|rest|pause|break|breath)/.test(normalized)) return "rest / regulation";
  if (/(say no|boundary|boundaries|limit)/.test(normalized)) return "boundaries";
  return "other";
}

function latestCommitmentRecordIndex(records: SessionMemoryRecord[]): number {
  let latestIndex = -1;
  let latestTime = 0;
  records.forEach((record, index) => {
    if (!record.microCommitment?.trim()) return;
    const parsed = Date.parse(record.closedAt);
    if (Number.isNaN(parsed)) return;
    if (parsed >= latestTime) {
      latestTime = parsed;
      latestIndex = index;
    }
  });
  return latestIndex;
}

function exchangeBucketLabel(exchangeCount: number): string {
  for (const bucket of EXCHANGE_BUCKETS) {
    if (exchangeCount >= bucket.min && (bucket.max === null || exchangeCount <= bucket.max)) {
      return bucket.label;
    }
  }
  return EXCHANGE_BUCKETS[0].label;
}

function resolveUserSessionRecords(
  profile: PromptReviewProfileRow,
  archiveByUserId: Map<string, SessionMemoryRecord[]>,
): { records: SessionMemoryRecord[]; fromArchive: boolean } {
  const userId = profile.id?.trim();
  if (userId) {
    const archived = archiveByUserId.get(userId);
    if (archived && archived.length > 0) {
      return { records: archived, fromArchive: true };
    }
  }

  return {
    records: readSessionMemoryRecords(profile.onboardingData ?? {}),
    fromArchive: false,
  };
}

export function aggregatePromptLibraryReviewSignals(
  profiles: PromptReviewProfileRow[],
  now = new Date(),
  archiveByUserId: Map<string, SessionMemoryRecord[]> = new Map(),
): PromptReviewSignals {
  const classificationStats = new Map<
    string,
    { users: number; sessionSum: number; engagedUsers: number; usersWithSessions: number }
  >();

  const exchangeBuckets = new Map<string, { count: number; themes: string[] }>();
  let exchangeTotal = 0;
  let exchangeSamples = 0;
  let sessionsAnalyzed = 0;
  let archivedSessions = 0;
  let legacyMemorySessions = 0;

  let commitmentTracked = 0;
  let commitmentFollowed = 0;
  const commitmentCategories = new Map<string, { tracked: number; followed: number }>();

  const loadDisengagement = new Map<string, { users: number; disengaged: number }>();

  for (const profile of profiles) {
    const classification = readClassification(profile);
    const onboarding = profile.onboardingData ?? {};
    const { records, fromArchive } = resolveUserSessionRecords(profile, archiveByUserId);
    sessionsAnalyzed += records.length;
    if (fromArchive) {
      archivedSessions += records.length;
    } else {
      legacyMemorySessions += records.length;
    }

    const classRow = classificationStats.get(classification) ?? {
      users: 0,
      sessionSum: 0,
      engagedUsers: 0,
      usersWithSessions: 0,
    };
    classRow.users += 1;
    classRow.sessionSum += records.length;
    if (records.length > 0) {
      classRow.usersWithSessions += 1;
      if (userHasContinuedEngagement(records, now)) {
        classRow.engagedUsers += 1;
      }
    }
    classificationStats.set(classification, classRow);

    const latestCheckinStatus = readLatestCheckinCommitmentStatus(onboarding);
    const latestCommitmentIndex = latestCommitmentRecordIndex(records);

    for (const [index, record] of records.entries()) {
      if (typeof record.exchangeCount === "number" && record.exchangeCount > 0) {
        const label = exchangeBucketLabel(record.exchangeCount);
        const bucket = exchangeBuckets.get(label) ?? { count: 0, themes: [] };
        bucket.count += 1;
        if (record.topic.trim() && bucket.themes.length < 3) {
          bucket.themes.push(record.topic.trim());
        }
        exchangeBuckets.set(label, bucket);
        exchangeTotal += record.exchangeCount;
        exchangeSamples += 1;
      }

      if (record.microCommitment?.trim()) {
        commitmentTracked += 1;
        const followed = commitmentLooksFollowed(
          record,
          index === latestCommitmentIndex ? latestCheckinStatus : null,
        );
        if (followed) commitmentFollowed += 1;

        const category = categorizeCommitment(record.microCommitment);
        const catRow = commitmentCategories.get(category) ?? { tracked: 0, followed: 0 };
        catRow.tracked += 1;
        if (followed) catRow.followed += 1;
        commitmentCategories.set(category, catRow);
      }
    }

    const loadCombo = resolveHighLoadCombination(readLoadSignals(onboarding));
    const loadRow = loadDisengagement.get(loadCombo) ?? { users: 0, disengaged: 0 };
    loadRow.users += 1;
    if (userIsDisengaged(records, now)) {
      loadRow.disengaged += 1;
    }
    loadDisengagement.set(loadCombo, loadRow);
  }

  const classificationEngagement = [...classificationStats.entries()]
    .map(([classification, stats]) => ({
      classification,
      userCount: stats.users,
      avgSessionsPerUser:
        stats.users > 0 ? Math.round((stats.sessionSum / stats.users) * 10) / 10 : 0,
      continuedEngagementRate:
        stats.usersWithSessions > 0 ? stats.engagedUsers / stats.usersWithSessions : null,
    }))
    .sort((left, right) => {
      const rateDelta =
        (right.continuedEngagementRate ?? -1) - (left.continuedEngagementRate ?? -1);
      if (rateDelta !== 0) return rateDelta;
      return right.avgSessionsPerUser - left.avgSessionsPerUser;
    });

  const exchangeCountDistribution = EXCHANGE_BUCKETS.map((bucket) => {
    const row = exchangeBuckets.get(bucket.label);
    return {
      label: bucket.label,
      sessionCount: row?.count ?? 0,
      sampleThemes: row?.themes ?? [],
    };
  });

  let peakExchangeBucket: string | null = null;
  let peakCount = 0;
  for (const row of exchangeCountDistribution) {
    if (row.sessionCount > peakCount) {
      peakCount = row.sessionCount;
      peakExchangeBucket = row.label;
    }
  }

  const commitmentByCategory = [...commitmentCategories.entries()]
    .map(([category, stats]) => ({
      category,
      tracked: stats.tracked,
      followed: stats.followed,
      followThroughRate: stats.tracked > 0 ? stats.followed / stats.tracked : null,
    }))
    .sort((left, right) => (right.followThroughRate ?? -1) - (left.followThroughRate ?? -1));

  const loadSignalDisengagement = [...loadDisengagement.entries()]
    .map(([loadCombination, stats]) => ({
      loadCombination,
      userCount: stats.users,
      disengagedCount: stats.disengaged,
      disengagementRate: stats.users > 0 ? stats.disengaged / stats.users : null,
    }))
    .filter((row) => row.userCount >= 3)
    .sort((left, right) => (right.disengagementRate ?? -1) - (left.disengagementRate ?? -1));

  return {
    profilesAnalyzed: profiles.length,
    sessionsAnalyzed,
    archivedSessions,
    legacyMemorySessions,
    classificationEngagement,
    exchangeCountDistribution,
    peakExchangeBucket,
    averageExchangeCount:
      exchangeSamples > 0 ? Math.round((exchangeTotal / exchangeSamples) * 10) / 10 : null,
    commitmentFollowThroughRate:
      commitmentTracked > 0 ? commitmentFollowed / commitmentTracked : null,
    commitmentByCategory,
    loadSignalDisengagement,
    reviewCadence: PROMPT_REVIEW_CADENCE,
    dataLimitation: PROMPT_REVIEW_DATA_LIMITATION,
  };
}

export async function fetchCoachingSessionArchiveRows(options?: {
  from?: string;
  to?: string;
}): Promise<CoachingSessionArchiveRow[]> {
  let query = supabase.from("coachingSessionArchive").select(PROMPT_REVIEW_ARCHIVE_SELECT);

  if (options?.from) {
    query = query.gte("finalizedAt", options.from);
  }
  if (options?.to) {
    query = query.lte("finalizedAt", options.to);
  }

  const { data, error } = await query.order("finalizedAt", { ascending: false });
  if (error) throw error;

  return (data ?? []) as CoachingSessionArchiveRow[];
}

export async function fetchPromptLibraryReviewSignals(): Promise<PromptReviewSignals> {
  const [profilesResult, archiveResult] = await Promise.all([
    supabase.from("profiles").select(PROMPT_REVIEW_PROFILE_SELECT),
    fetchCoachingSessionArchiveRows(),
  ]);

  if (profilesResult.error) throw profilesResult.error;

  const archiveByUserId = groupArchiveRowsByUser(archiveResult);
  return aggregatePromptLibraryReviewSignals(
    (profilesResult.data ?? []) as PromptReviewProfileRow[],
    new Date(),
    archiveByUserId,
  );
}

export async function exportSessionArchiveCsv(options?: {
  from?: string;
  to?: string;
}): Promise<string> {
  const rows = await fetchCoachingSessionArchiveRows(options);
  return buildSessionArchiveCsv(rows);
}

export function downloadSessionArchiveCsv(csv: string, filename = "coaching-session-archive.csv"): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
