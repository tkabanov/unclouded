/** Bubble custom event bTIAw — load signals + nervous system → pressure profile text. */

const LOAD_SEVERITY: Record<string, number> = {
  manageable: 1,
  mild: 1,
  stable: 1,
  secure: 1,
  mind_feels_clear_most_of_the_time: 1,
  relationships_feel_mostly_supportive: 1,
  life_feels_mostly_manageable: 1,
  financial_situation_feels_stable: 1,
  moderate: 2,
  some_strain: 2,
  noticeable: 2,
  tight: 2,
  some_noise_but_manageable: 2,
  some_friction_but_manageable: 2,
  stretched_but_coping: 2,
  some_financial_worry_but_not_consuming: 2,
  heavy: 3,
  significant: 3,
  high: 3,
  stressed: 3,
  head_rarely_feels_quiet___constant: 3,
  significant_conflict_or_strain_in_key_relationships: 3,
  overwhelmed_by_practical_demands: 3,
  financial_stress_is_significant_daily_presence: 3,
  overwhelming: 4,
  severe: 4,
  crisis: 4,
  critical: 4,
};

const STATE_SEVERITY: Record<string, number> = {
  grounded: 1,
  wired: 3,
  depleted: 4,
  shut_down: 4,
  strong: 1,
  moderate: 2,
  low: 3,
};

function averageSeverity(values: Record<string, string>, map: Record<string, number>): number {
  const scores = Object.values(values).map((value) => map[value] ?? 2);
  if (scores.length === 0) return 2;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function resolvePressureProfile(
  loadSignals: Record<string, string>,
  stateSignals: Record<string, string>,
): string {
  const avgLoad = averageSeverity(loadSignals, LOAD_SEVERITY);
  const avgState = averageSeverity(stateSignals, STATE_SEVERITY);
  const combined = (avgLoad + avgState) / 2;

  if (combined >= 3.5) return "System Overload";
  if (combined >= 2.5) return "Elevated Pressure";
  if (combined >= 1.5) return "Moderate Load";
  return "Manageable Load";
}
