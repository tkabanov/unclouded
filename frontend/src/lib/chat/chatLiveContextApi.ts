import { fetchConversations } from "@/lib/chat/chatConversationsApi";
import { readSessionLifecycleState } from "@/lib/chat/chatSessionLifecycleApi";
import { fetchRecentPathReflectionAnswers } from "@/lib/chat/pathsReflectionApi";
import { fetchLatestDailyCheckIn, fetchDailyCheckInStreak } from "@/lib/dashboard/checkinApi";
import { fetchMicroCommitments } from "@/lib/dashboard/microCommitmentsApi";
import type { ChatLiveContext } from "../../../../supabase/functions/chat/prompt/types.ts";

/**
 * Aggregate live user signals for chat prompt assembly (T-003).
 * Each field is null or empty when the backing API has no data — no fabrication.
 */
export async function fetchChatLiveContext(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<ChatLiveContext> {
  const [
    latestCheckIn,
    streakDays,
    microCommitments,
    conversations,
    pathReflections,
  ] = await Promise.all([
    fetchLatestDailyCheckIn(userId, onboardingData),
    fetchDailyCheckInStreak(userId, onboardingData),
    fetchMicroCommitments(userId, onboardingData),
    fetchConversations(userId, onboardingData),
    fetchRecentPathReflectionAnswers(userId, onboardingData),
  ]);

  const activeItem = microCommitments.find((item) => !item.isCompleted);
  const lifecycleState = readSessionLifecycleState(onboardingData);
  const activeMicroCommitment =
    activeItem?.microCommitmentText?.trim() ||
    lifecycleState.activeMicroCommitment?.trim() ||
    null;

  const sessionCount = conversations.length > 0 ? conversations.length : null;

  return {
    latestCheckIn: latestCheckIn
      ? {
          date: latestCheckIn.date,
          pulse: latestCheckIn.pulse,
          feeling: latestCheckIn.feeling,
          energyStressLevel: latestCheckIn.energyStressLevel,
          microCommitmentStatus: latestCheckIn.microCommitmentStatus,
        }
      : null,
    streakDays: Number.isFinite(streakDays) ? streakDays : null,
    activeMicroCommitment,
    sessionCount,
    pathReflections,
  };
}
