import { supabase } from "@/integrations/supabase/client";
import { callChatEdge } from "@/lib/chat/chatAiReplyStub";
import type { ChatMessage } from "@/components/chat/types";
import {
  createConversation,
  touchConversationAfterMessage,
  type ChatSessionType,
} from "@/lib/chat/chatConversationsApi";
import {
  insertAssistantMessage,
  insertUserMessage,
} from "@/lib/chat/chatMessagesApi";
import { updatePulseBaselineAfterCheckIn } from "@/lib/dashboard/pulseBaselineApi";

export type QuickCheckinInput = {
  pulse: number;
  text: string;
};

export type QuickCheckinResult = {
  conversationId: string;
  reply: string;
};

/**
 * Lightweight check-in: creates a quick_checkin conversation and calls chat once.
 */
export async function submitQuickCheckin(
  userId: string,
  input: QuickCheckinInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<QuickCheckinResult> {
  const trimmedText = input.text.trim();
  if (!trimmedText) {
    throw new Error("Check-in text is required");
  }

  const conversation = await createConversation(
    userId,
    onboardingData,
    "Quick check-in",
    "quick_checkin",
  );

  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: `Pulse: ${input.pulse}/10. ${trimmedText}`,
  };

  const reply = await callChatEdge({
    messages: [userMessage],
    conversationId: conversation.id,
    context: "quick_checkin",
    sessionType: "quick_checkin",
    exchangeCount: 1,
  });

  if (typeof reply !== "string") {
    throw new Error("Unexpected chat response for quick check-in");
  }

  const userContent = userMessage.content;
  await insertUserMessage({
    conversationId: conversation.id,
    userId,
    content: userContent,
    onboardingData,
  });
  await insertAssistantMessage({
    conversationId: conversation.id,
    userId,
    content: reply,
    onboardingData,
  });
  await touchConversationAfterMessage(userId, conversation.id, reply);

  const checkInDate = new Date().toISOString();
  const client = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  await client.from("dailyCheckin").insert({
    userId,
    mood: input.pulse,
    energyStressLevel: input.pulse,
    reflection: trimmedText,
    date: checkInDate,
  });

  await updatePulseBaselineAfterCheckIn(userId, input.pulse, {
    checkInDate,
    checkInAlreadyPersisted: true,
  });

  return { conversationId: conversation.id, reply };
}

export type { ChatSessionType };
