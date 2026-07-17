import { supabase } from "@/integrations/supabase/client";
import { callChatEdge } from "@/lib/chat/chatAiReplyStub";
import type { ChatMessage } from "@/components/chat/types";
import {
  createConversation,
  type ChatSessionType,
} from "@/lib/chat/chatConversationsApi";
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

  await updatePulseBaselineAfterCheckIn(userId, input.pulse);

  const client = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  await client.from("dailyCheckin").insert({
    userId,
    mood: input.pulse,
    energyStressLevel: input.pulse,
    reflection: trimmedText,
    date: new Date().toISOString(),
  });

  return { conversationId: conversation.id, reply };
}

export type { ChatSessionType };
