export type PulseMoodEntry = {
  date: string;
  mood: number;
};

/** Rolling 14-day average pulse (mood) from daily check-in history. */
export function compute14DayPulseBaseline(moods: PulseMoodEntry[]): number | null {
  if (moods.length === 0) return null;

  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recent = moods.filter((entry) => {
    const parsed = Date.parse(entry.date);
    return Number.isFinite(parsed) && parsed >= cutoff && Number.isFinite(entry.mood);
  });

  if (recent.length === 0) return null;

  const sum = recent.reduce((total, entry) => total + entry.mood, 0);
  return Math.round((sum / recent.length) * 100) / 100;
}

/** True when new mood is at least 3 points below the established baseline. */
export function detectSignificantPulseDrop(newMood: number, baseline: number | null): boolean {
  if (baseline === null || !Number.isFinite(newMood)) return false;
  return newMood <= baseline - 3;
}

/**
 * Remove one persisted check-in row from history (same calendar day + mood).
 * Used when the DB fetch already includes the submission being evaluated.
 */
export function excludePersistedCheckIn(
  moods: PulseMoodEntry[],
  newMood: number,
  checkInDate: string,
): PulseMoodEntry[] {
  const targetDay = checkInDate.slice(0, 10);
  let removed = false;
  return moods.filter((entry) => {
    if (removed) return true;
    if (entry.date.slice(0, 10) === targetDay && entry.mood === newMood) {
      removed = true;
      return false;
    }
    return true;
  });
}

export type PulseBaselineAssessment = {
  /** Rolling 14-day average after including the new check-in. */
  pulseBaseline: number | null;
  /** Baseline from prior check-ins only (REQ-05 comparison point). */
  baselineBeforeCheckIn: number | null;
  significantPulseDrop: boolean;
};

/**
 * REQ-05: compare new mood against the existing baseline, then roll baseline forward.
 */
export function assessPulseBaselineUpdate(
  priorMoods: PulseMoodEntry[],
  newMood: number,
  newEntryDate: string,
): PulseBaselineAssessment {
  const baselineBeforeCheckIn = compute14DayPulseBaseline(priorMoods);
  const significantPulseDrop = detectSignificantPulseDrop(newMood, baselineBeforeCheckIn);
  const pulseBaseline = compute14DayPulseBaseline([
    ...priorMoods,
    { date: newEntryDate, mood: newMood },
  ]);

  return { pulseBaseline, baselineBeforeCheckIn, significantPulseDrop };
}
