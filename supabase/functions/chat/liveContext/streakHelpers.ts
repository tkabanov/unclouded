/** Consecutive daily check-in streak — calendar days, UTC date keys. */

export function toCheckInDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeCheckInDateKeys(dates: string[]): string[] {
  return [...new Set(dates.map((date) => date.slice(0, 10)).filter(Boolean))];
}

/**
 * Count consecutive check-in days ending at anchorKey (inclusive).
 */
export function computeStreakFromDateKeys(
  dateKeys: string[],
  anchorKey: string,
): number {
  const dateSet = new Set(normalizeCheckInDateKeys(dateKeys));
  if (!dateSet.has(anchorKey.slice(0, 10))) return 0;

  let streak = 0;
  const cursor = new Date(`${anchorKey.slice(0, 10)}T12:00:00.000Z`);
  while (dateSet.has(toCheckInDateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function calendarDaysBetween(laterKey: string, earlierKey: string): number {
  const later = new Date(`${laterKey.slice(0, 10)}T12:00:00.000Z`);
  const earlier = new Date(`${earlierKey.slice(0, 10)}T12:00:00.000Z`);
  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}

/**
 * Effective streak for display: consecutive days ending on the most recent check-in,
 * but only if that check-in was today or yesterday. A missed day resets to 0.
 */
export function resolveEffectiveCheckInStreak(
  dateKeys: string[],
  referenceDate: Date = new Date(),
): number {
  const normalized = normalizeCheckInDateKeys(dateKeys);
  if (normalized.length === 0) return 0;

  const today = toCheckInDateKey(referenceDate);
  const mostRecent = normalized.sort((a, b) => b.localeCompare(a))[0];
  const daysSinceMostRecent = calendarDaysBetween(today, mostRecent);

  if (daysSinceMostRecent >= 2) return 0;

  return computeStreakFromDateKeys(normalized, mostRecent);
}
