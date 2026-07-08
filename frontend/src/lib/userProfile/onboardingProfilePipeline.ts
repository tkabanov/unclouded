import { calculateUserAlignment } from "./calculateUserAlignment";
import { calculateUserPerformance } from "./calculateUserPerformance";
import { calculateUserStability } from "./calculateUserStability";

/**
 * Runs stability → alignment → performance pillar calculators.
 * Mirrors ScheduleAPIEvent chain on bTGNJ workflows bTHVC / bTHja / bTHgY.
 */
export async function runPillarScoreCalculators(userId: string): Promise<void> {
  await calculateUserStability(userId);
  await calculateUserAlignment(userId);
  await calculateUserPerformance(userId);
}
