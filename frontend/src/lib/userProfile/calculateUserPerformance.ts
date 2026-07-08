import { computePillarScore } from "./aggregatePillarScore";
import {
  loadOnboardingData,
  patchPillarScoreNumber,
  PERFORMANCE_SCORE_NUMBER_FIELD,
  readQuestionScores,
} from "./pillarScoreUserData";

/** Bubble API event calculate_user_performance (bTHyU); workflow bTHgY parity. */
export async function calculateUserPerformance(userId: string): Promise<number> {
  const onboardingData = await loadOnboardingData(userId);
  const questions = readQuestionScores(onboardingData, "pq");
  const score = computePillarScore(questions);
  await patchPillarScoreNumber(userId, PERFORMANCE_SCORE_NUMBER_FIELD, score);
  return score;
}
