import { computePillarScore } from "./aggregatePillarScore";
import {
  ALIGNMENT_SCORE_NUMBER_FIELD,
  loadOnboardingData,
  patchPillarScoreNumber,
  readQuestionScores,
} from "./pillarScoreUserData";

/** Bubble API event calculate_user_alignment (bTHyM); workflow bTHja parity. */
export async function calculateUserAlignment(userId: string): Promise<number> {
  const onboardingData = await loadOnboardingData(userId);
  const questions = readQuestionScores(onboardingData, "aq");
  const score = computePillarScore(questions);
  await patchPillarScoreNumber(userId, ALIGNMENT_SCORE_NUMBER_FIELD, score);
  return score;
}
