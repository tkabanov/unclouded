import { useCallback, useEffect, useState } from "react";

import { AiInsightsConsentGate } from "@/components/aiInsights/AiInsightsConsentGate";
import VoiceSessionPanel from "@/components/voice/VoiceSessionPanel";
import RealtimeTranscriptReadOnly from "@/components/voice/realtime/RealtimeTranscriptReadOnly";
import type { ChatAiProfileData } from "@/lib/chat/chatAiReplyStub";
import {
  fetchConversationById,
  type ChatSessionType,
} from "@/lib/chat/chatConversationsApi";
import { cn } from "@/lib/utils";

import ChatPanelMount from "./ChatPanelMount";

export interface ConversationPanelMountProps {
  conversationId: string;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  context?: string;
  profileData?: ChatAiProfileData;
  onThreadUpdated?: () => void;
  onSessionClosed?: () => void;
  className?: string;
}

/**
 * Routes to text or voice panel based on conversation sessionType.
 * NCLDD-55: both panels sit behind the first-use AI Insights consent choice.
 */
export default function ConversationPanelMount({
  conversationId,
  userId,
  onboardingData,
  context,
  profileData,
  onThreadUpdated,
  onSessionClosed,
  className,
}: ConversationPanelMountProps) {
  const [sessionType, setSessionType] = useState<ChatSessionType | null | "loading">("loading");

  const resolveSessionType = useCallback(async () => {
    setSessionType("loading");
    try {
      const conversation = await fetchConversationById(
        userId,
        conversationId,
        onboardingData,
      );
      setSessionType(conversation?.sessionType ?? "text");
    } catch {
      setSessionType("text");
    }
  }, [conversationId, onboardingData, userId]);

  useEffect(() => {
    void resolveSessionType();
  }, [resolveSessionType]);

  if (sessionType === "loading") {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        Loading conversation…
      </div>
    );
  }

  // NCLDD-57: a realtime conversation can't be continued from history; show its transcript.
  if (sessionType === "voice_conversation") {
    return (
      <RealtimeTranscriptReadOnly
        key={conversationId}
        conversationId={conversationId}
        onboardingData={onboardingData}
        className={className}
      />
    );
  }

  if (sessionType === "voice") {
    return (
      <AiInsightsConsentGate className={className}>
        <VoiceSessionPanel
          key={conversationId}
          conversationId={conversationId}
          userId={userId}
          onboardingData={onboardingData}
          context={context}
          profileData={profileData}
          onThreadUpdated={onThreadUpdated}
          onSessionClosed={onSessionClosed}
          className={className}
        />
      </AiInsightsConsentGate>
    );
  }

  return (
    <AiInsightsConsentGate className={className}>
      <ChatPanelMount
        key={conversationId}
        conversationId={conversationId}
        userId={userId}
        onboardingData={onboardingData}
        context={context}
        profileData={profileData}
        onThreadUpdated={onThreadUpdated}
        onSessionClosed={onSessionClosed}
        className={className}
      />
    </AiInsightsConsentGate>
  );
}
