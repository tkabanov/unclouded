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
