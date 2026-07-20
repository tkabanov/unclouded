export type WeeklyTrendPoint = {
  weekStart: string;
  value: number | null;
};

export const EMPLOYER_WEEKLY_TREND_WEEKS = 8;
export const EMPLOYER_MIN_COHORT_SIZE = 5;

function parseDate(value: string): Date | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

/** ISO date for Monday of the week containing `date` (UTC). */
export function startOfWeekUtc(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

export function recentWeekStarts(weeks: number, now = new Date()): string[] {
  const currentWeekStart = parseDate(`${startOfWeekUtc(now)}T00:00:00.000Z`);
  if (!currentWeekStart) return [];

  const starts: string[] = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const week = new Date(currentWeekStart);
    week.setUTCDate(week.getUTCDate() - index * 7);
    starts.push(week.toISOString().slice(0, 10));
  }
  return starts;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

export function buildWeeklyPulseTrend(
  checkins: Array<{ date: string; mood: number }>,
  weeks = EMPLOYER_WEEKLY_TREND_WEEKS,
  now = new Date(),
): WeeklyTrendPoint[] {
  const weekStarts = recentWeekStarts(weeks, now);
  const buckets = new Map<string, number[]>();

  for (const weekStart of weekStarts) {
    buckets.set(weekStart, []);
  }

  for (const checkin of checkins) {
    const parsed = parseDate(checkin.date);
    if (!parsed || !Number.isFinite(checkin.mood)) continue;
    const weekStart = startOfWeekUtc(parsed);
    const bucket = buckets.get(weekStart);
    if (!bucket) continue;
    bucket.push(checkin.mood);
  }

  return weekStarts.map((weekStart) => ({
    weekStart,
    value: average(buckets.get(weekStart) ?? []),
  }));
}

export function buildWeeklySessionsPerActiveUserTrend(
  sessions: Array<{ createdAt: string; userId: string }>,
  weeks = EMPLOYER_WEEKLY_TREND_WEEKS,
  now = new Date(),
): WeeklyTrendPoint[] {
  const weekStarts = recentWeekStarts(weeks, now);
  const sessionCounts = new Map<string, Map<string, number>>();

  for (const weekStart of weekStarts) {
    sessionCounts.set(weekStart, new Map());
  }

  for (const session of sessions) {
    const parsed = parseDate(session.createdAt);
    if (!parsed || !session.userId) continue;
    const weekStart = startOfWeekUtc(parsed);
    const users = sessionCounts.get(weekStart);
    if (!users) continue;
    users.set(session.userId, (users.get(session.userId) ?? 0) + 1);
  }

  return weekStarts.map((weekStart) => {
    const users = sessionCounts.get(weekStart);
    if (!users || users.size === 0) {
      return { weekStart, value: null };
    }
    const totalSessions = [...users.values()].reduce((sum, count) => sum + count, 0);
    return {
      weekStart,
      value: Math.round((totalSessions / users.size) * 100) / 100,
    };
  });
}

export function computePathEngagementPercent(
  enrollments: Array<{ userId: string; status: string }>,
  enrolledUserCount: number,
): number | null {
  if (enrolledUserCount === 0) return null;

  const usersWithActivePath = new Set<string>();
  for (const enrollment of enrollments) {
    if (enrollment.status !== "active" || !enrollment.userId) continue;
    usersWithActivePath.add(enrollment.userId);
  }

  return Math.round((usersWithActivePath.size / enrolledUserCount) * 1000) / 10;
}

export function formatWeekLabel(weekStart: string): string {
  const parsed = parseDate(`${weekStart}T00:00:00.000Z`);
  if (!parsed) return weekStart;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
