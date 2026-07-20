export const MANAGER_MIN_COHORT_SIZE = 5;
export const MANAGER_PULSE_TREND_DAYS = 30;

export type StabilityBand = "high" | "moderate" | "low";

export type StabilityBandPercentages = Record<StabilityBand, number>;

export type DailyTrendPoint = {
  date: string;
  value: number | null;
};

const STABILITY_BAND_LOW_MAX = 2.49;
const STABILITY_BAND_MODERATE_MAX = 3.99;

function parseDate(value: string): Date | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function dateKey(value: string): string {
  return value.slice(0, 10);
}

export function classifyStabilityBand(score: number): StabilityBand | null {
  if (!Number.isFinite(score)) return null;
  if (score <= STABILITY_BAND_LOW_MAX) return "low";
  if (score <= STABILITY_BAND_MODERATE_MAX) return "moderate";
  return "high";
}

/** Percent of opted-in cohort in each stability band (scores only — no identities). */
export function computeStabilityBandPercentages(
  scores: number[],
): StabilityBandPercentages | null {
  const valid = scores.filter((score) => Number.isFinite(score));
  if (valid.length === 0) return null;

  const counts: Record<StabilityBand, number> = { high: 0, moderate: 0, low: 0 };
  for (const score of valid) {
    const band = classifyStabilityBand(score);
    if (band) counts[band] += 1;
  }

  const total = valid.length;
  return {
    high: Math.round((counts.high / total) * 1000) / 10,
    moderate: Math.round((counts.moderate / total) * 1000) / 10,
    low: Math.round((counts.low / total) * 1000) / 10,
  };
}

export function recentDayKeys(days: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    day.setUTCDate(day.getUTCDate() - offset);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

/** Daily team-average pulse across anonymized check-ins (last N days). */
export function buildDailyTeamPulseTrend(
  checkins: Array<{ date: string; mood: number }>,
  days = MANAGER_PULSE_TREND_DAYS,
  now = new Date(),
): DailyTrendPoint[] {
  const dayKeys = recentDayKeys(days, now);
  const buckets = new Map<string, number[]>();

  for (const key of dayKeys) {
    buckets.set(key, []);
  }

  for (const checkin of checkins) {
    const key = dateKey(checkin.date);
    const bucket = buckets.get(key);
    if (!bucket || !Number.isFinite(checkin.mood)) continue;
    bucket.push(checkin.mood);
  }

  return dayKeys.map((date) => ({
    date,
    value: average(buckets.get(date) ?? []),
  }));
}

export function computeAverageSessionEngagement(
  sessions: Array<{ userId: string; createdAt: string }>,
  enrolledUserCount: number,
  windowStartIso: string,
): number | null {
  if (enrolledUserCount === 0) return null;

  const windowStart = parseDate(windowStartIso);
  if (!windowStart) return null;

  let totalSessions = 0;
  for (const session of sessions) {
    const createdAt = parseDate(session.createdAt);
    if (!createdAt || createdAt < windowStart) continue;
    totalSessions += 1;
  }

  return Math.round((totalSessions / enrolledUserCount) * 100) / 100;
}

export const STABILITY_BAND_LABELS: Record<StabilityBand, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
};
