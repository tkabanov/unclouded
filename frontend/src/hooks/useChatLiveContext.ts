import { useCallback, useEffect, useState } from "react";
import { fetchChatLiveContext } from "@/lib/chat/chatLiveContextApi";
import type { ChatLiveContext } from "../../../supabase/functions/chat/prompt/types.ts";

const EMPTY_LIVE_CONTEXT: ChatLiveContext = {
  latestCheckIn: null,
  streakDays: null,
  activeMicroCommitment: null,
  sessionCount: null,
  pathReflections: [],
};

/**
 * Load live coaching signals for chat prompt assembly when user/profile is available.
 */
export function useChatLiveContext(
  userId: string | undefined,
  onboardingData: Record<string, unknown> | null | undefined,
) {
  const [liveContext, setLiveContext] = useState<ChatLiveContext>(EMPTY_LIVE_CONTEXT);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setLiveContext(EMPTY_LIVE_CONTEXT);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchChatLiveContext(userId, onboardingData ?? null);
      setLiveContext(next);
    } catch (error) {
      console.error("Failed to load chat live context", error);
      setLiveContext(EMPTY_LIVE_CONTEXT);
    } finally {
      setLoading(false);
    }
  }, [userId, onboardingData]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { liveContext, loading, reload };
}
