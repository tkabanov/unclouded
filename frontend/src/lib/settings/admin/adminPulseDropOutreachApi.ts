import { supabase } from "@/integrations/supabase/client";
import { resolveHealthModeFlags } from "@/lib/userProfile/healthModeFlags";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export const ADMIN_PULSE_DROP_OUTREACH_NOTICE =
  "Users whose latest check-in pulse dropped ≥3 points below their 14-day baseline (REQ-05). Review for manual outreach — Kota already receives this flag in session context for mid-cycle state checks." as const;

export const ADMIN_PULSE_DROP_OUTREACH_EMPTY =
  "No users currently flagged for significant pulse drop." as const;

export type PulseDropOutreachCandidate = {
  userId: string;
  firstName: string | null;
  email: string | null;
  pulseBaseline: number | null;
  latestPulse: number | null;
  pulseDropPoints: number | null;
  griefModeActive: boolean;
  recoveryModeActive: boolean;
  flaggedAt: string | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

type PulseDropProfileRow = {
  id: string;
  firstName: string | null;
  email: string | null;
  pulseBaseline: number | null;
  significantPulseDrop: boolean;
  updatedAt: string | null;
  onboardingData?: Record<string, unknown> | null;
  results?: Record<string, unknown> | null;
};

type LatestCheckinRow = {
  userId: string;
  mood: number;
  date: string;
};

export function computePulseDropPoints(
  baseline: number | null,
  latestPulse: number | null,
): number | null {
  if (baseline === null || latestPulse === null) return null;
  if (!Number.isFinite(baseline) || !Number.isFinite(latestPulse)) return null;
  const drop = baseline - latestPulse;
  return drop >= 0 ? Math.round(drop * 100) / 100 : null;
}

export function mapPulseDropOutreachCandidate(
  profile: PulseDropProfileRow,
  latestCheckin: LatestCheckinRow | undefined,
): PulseDropOutreachCandidate {
  const latestPulse =
    typeof latestCheckin?.mood === "number" && Number.isFinite(latestCheckin.mood)
      ? latestCheckin.mood
      : null;
  const pulseBaseline =
    typeof profile.pulseBaseline === "number" && Number.isFinite(profile.pulseBaseline)
      ? profile.pulseBaseline
      : null;
  const healthFlags = resolveHealthModeFlags(profile);

  return {
    userId: profile.id,
    firstName: profile.firstName ?? null,
    email: profile.email ?? null,
    pulseBaseline,
    latestPulse,
    pulseDropPoints: computePulseDropPoints(pulseBaseline, latestPulse),
    griefModeActive: healthFlags.griefModeActive,
    recoveryModeActive: healthFlags.recoveryModeActive,
    flaggedAt: profile.updatedAt ?? latestCheckin?.date ?? null,
  };
}

function latestCheckinByUser(rows: LatestCheckinRow[]): Map<string, LatestCheckinRow> {
  const byUser = new Map<string, LatestCheckinRow>();
  for (const row of rows) {
    if (!byUser.has(row.userId)) {
      byUser.set(row.userId, row);
    }
  }
  return byUser;
}

async function fetchLatestCheckins(userIds: string[]): Promise<Map<string, LatestCheckinRow>> {
  if (userIds.length === 0) return new Map();

  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("dailyCheckin")
    .select("userId, mood, date")
    .in("userId", userIds)
    .order("date", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return new Map();
    throw error;
  }

  const rows = (data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const userId = typeof record.userId === "string" ? record.userId : null;
      const mood = Number(record.mood);
      const date = typeof record.date === "string" ? record.date : null;
      if (!userId || !date || Number.isNaN(mood)) return null;
      return { userId, mood, date };
    })
    .filter((row): row is LatestCheckinRow => row !== null);

  return latestCheckinByUser(rows);
}

/** REQ-05 — admin outreach queue for users with significantPulseDrop = true. */
export async function listPulseDropOutreachCandidates(): Promise<PulseDropOutreachCandidate[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, firstName, email, pulseBaseline, significantPulseDrop, updatedAt, onboardingData, results",
    )
    .eq("significantPulseDrop", true)
    .order("updatedAt", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  const profiles = (data ?? []) as PulseDropProfileRow[];
  const checkinsByUser = await fetchLatestCheckins(profiles.map((profile) => profile.id));

  return profiles
    .map((profile) => mapPulseDropOutreachCandidate(profile, checkinsByUser.get(profile.id)))
    .sort((left, right) => {
      const leftDrop = left.pulseDropPoints ?? -1;
      const rightDrop = right.pulseDropPoints ?? -1;
      if (rightDrop !== leftDrop) return rightDrop - leftDrop;
      const leftTime = left.flaggedAt ? Date.parse(left.flaggedAt) : 0;
      const rightTime = right.flaggedAt ? Date.parse(right.flaggedAt) : 0;
      return rightTime - leftTime;
    });
}

export function formatPulseDropSummary(
  baseline: number | null,
  latestPulse: number | null,
): string {
  if (baseline === null || latestPulse === null) return "—";
  const drop = computePulseDropPoints(baseline, latestPulse);
  if (drop === null) return `${latestPulse} / baseline ${baseline}`;
  return `${latestPulse} (−${drop} from ${baseline})`;
}
