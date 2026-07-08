import { computePillarScore } from "./aggregatePillarScore";
import {
  loadOnboardingData,
  patchPillarScoreNumber,
  readQuestionScores,
  STABILITY_SCORE_NUMBER_FIELD,
} from "./pillarScoreUserData";

/** Bubble API event calculate_user_stability (bTHxu); workflow bTHVC parity. */
export async function calculateUserStability(userId: string): Promise<number> {
  const onboardingData = await loadOnboardingData(userId);
  const questions = readQuestionScores(onboardingData, "sq");
  const score = computePillarScore(questions);
  await patchPillarScoreNumber(userId, STABILITY_SCORE_NUMBER_FIELD, score);
  return score;
}
