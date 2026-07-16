import type { ResultsData } from "@/lib/classification";
import { computeScoreDeltas } from "@/lib/reassessment";

/** Section 2 — seven trajectory types (null for initial assessment). */
export const TRAJECTORY_TYPE = {
  STABILIZING: "stabilizing",
  REBUILDING: "rebuilding",
  GAINING_MOMENTUM: "gaining_momentum",
  ACROSS_THE_BOARD_GROWTH: "across_the_board_growth",
  HOLDING_STEADY: "holding_steady",
  NAVIGATING_DIFFICULTY: "navigating_difficulty",
  MIXED_MOVEMENT: "mixed_movement",
} as const;

export type TrajectoryType = (typeof TRAJECTORY_TYPE)[keyof typeof TRAJECTORY_TYPE];

export const TRAJECTORY_LANGUAGE: Record<TrajectoryType, string> = {
  stabilizing: "Stability is rising. The ground is getting more solid. That took something.",
  rebuilding:
    "Alignment is shifting. The gap between how you are living and what matters to you is closing.",
  gaining_momentum:
    "Performance is building. The execution is starting to match the intention.",
  across_the_board_growth:
    "All three dimensions moved forward. This is what the work looks like.",
  holding_steady:
    "Your scores are holding. Maintenance is underrated — it means you are not losing ground.",
  navigating_difficulty:
    "Some scores shifted down. Hard seasons show up in the data. This is honest information, not failure.",
  mixed_movement:
    "Different dimensions moved in different directions. That is what real life looks like.",
};

const IMPROVE = 0.2;
const DECLINE = -0.2;

/**
 * Pick one of 7 trajectory types from first → second assessment score deltas.
 * Uses Stability / Performance / Alignment only (Section 2 dimensions).
 */
export function computeTrajectoryType(first: ResultsData, second: ResultsData): TrajectoryType {
  const deltas = computeScoreDeltas(first, second).filter((d) =>
    ["stability_score", "performance_score", "alignment_score"].includes(d.key),
  );

  const byKey = Object.fromEntries(deltas.map((d) => [d.key, d.delta])) as Record<
    string,
    number
  >;
  const stability = byKey.stability_score ?? 0;
  const performance = byKey.performance_score ?? 0;
  const alignment = byKey.alignment_score ?? 0;

  const improved = deltas.filter((d) => d.delta >= IMPROVE).length;
  const declined = deltas.filter((d) => d.delta <= DECLINE).length;

  if (improved === 3) return TRAJECTORY_TYPE.ACROSS_THE_BOARD_GROWTH;
  if (declined >= 1 && improved === 0) return TRAJECTORY_TYPE.NAVIGATING_DIFFICULTY;
  if (improved === 0 && declined === 0) return TRAJECTORY_TYPE.HOLDING_STEADY;
  if (improved >= 1 && declined >= 1) return TRAJECTORY_TYPE.MIXED_MOVEMENT;

  // Single-dimension (or multi without decline) growth — pick dominant rising pillar.
  if (stability >= IMPROVE && stability >= performance && stability >= alignment) {
    return TRAJECTORY_TYPE.STABILIZING;
  }
  if (alignment >= IMPROVE && alignment >= performance) {
    return TRAJECTORY_TYPE.REBUILDING;
  }
  if (performance >= IMPROVE) {
    return TRAJECTORY_TYPE.GAINING_MOMENTUM;
  }

  return TRAJECTORY_TYPE.MIXED_MOVEMENT;
}

export function trajectoryLanguage(type: TrajectoryType | null | undefined): string | null {
  if (!type) return null;
  return TRAJECTORY_LANGUAGE[type] ?? null;
}
