import { fetchConversations } from "@/lib/chat/chatConversationsApi";
import { readSessionLifecycleState } from "@/lib/chat/chatSessionLifecycleApi";
import { fetchRecentPathReflectionAnswers } from "@/lib/chat/pathsReflectionApi";
import { fetchLatestDailyCheckIn, fetchDailyCheckInStreak } from "@/lib/dashboard/checkinApi";
import { fetchMicroCommitments } from "@/lib/dashboard/microCommitmentsApi";
import { aggregateLiveContext } from "../../../../supabase/functions/chat/liveContext/liveContextHelpers.ts";
import type { ChatLiveContext } from "../../../../supabase/functions/chat/prompt/types.ts";

/**
 * Aggregate live user signals for chat prompt assembly (T-003).
 * Edge loads the same shape server-side (T-008); this remains for client UI/dev parity.
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
  const sessionCount = conversations.length > 0 ? conversations.length : null;

  return aggregateLiveContext({
    latestCheckIn,
    streakDays,
    activeMicroCommitmentCandidates: [
      activeItem?.microCommitmentText,
      lifecycleState.activeMicroCommitment,
    ],
    sessionCount,
    pathReflections,
  });
}
