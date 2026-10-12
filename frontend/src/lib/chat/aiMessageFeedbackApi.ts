import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

import { isValidUuid } from "../../../../supabase/functions/_shared/uuidHelpers.ts";

/**
 * NCLDD-55 (OVR-073) — explicit 👍 / 👎 on Kota replies. Writes go through the
 * set_ai_message_feedback RPC (ownership + reason validation in SQL).
 */

// Untyped until frontend/src/integrations/supabase/types.ts is regenerated after the migration.
const db = supabase as unknown as SupabaseClient;

export type AiFeedbackRating = 1 | -1;

export type AiMessageFeedback = {
  rating: AiFeedbackRating;
  reasons: string[];
};

/** Only saved Kota replies (DB uuid, not `pending-*` optimistic ids) can be rated. */
export function canRateMessage(message: { id: string; role: "user" | "assistant" }): boolean {
  return message.role === "assistant" && isValidUuid(message.id);
}

export type ConversationFeedback =
  | { available: false }
  | { available: true; byMessageId: Record<string, AiMessageFeedback> };

export async function fetchConversationFeedback(
  conversationId: string,
): Promise<ConversationFeedback> {
  const { data, error } = await db
    .from("aiMessageFeedback")
    .select("messageId, rating, reasons")
    .eq("conversationId", conversationId);
  if (error) {
    // Before the migration is applied the table is missing: hide the controls, never break chat.
    console.warn("AI message feedback unavailable", error.message);
    return { available: false };
  }
  const byMessageId: Record<string, AiMessageFeedback> = {};
  for (const row of (data ?? []) as { messageId: string; rating: number; reasons: string[] | null }[]) {
    if (row.rating !== 1 && row.rating !== -1) continue;
    byMessageId[row.messageId] = { rating: row.rating, reasons: row.reasons ?? [] };
  }
  return { available: true, byMessageId };
}

/** rating 0 clears the feedback. Returns what the database stored. */
export async function setAiMessageFeedback(
  messageId: string,
  rating: AiFeedbackRating | 0,
  reasons: string[] = [],
): Promise<AiMessageFeedback | null> {
  const { data, error } = await db.rpc("set_ai_message_feedback", {
    p_message_id: messageId,
    p_rating: rating,
    p_reasons: reasons,
  });
  if (error) throw new Error("Couldn't save your feedback.");
  const result = (data ?? {}) as { ok?: boolean; error?: string; rating?: number; reasons?: unknown };
  if (result.ok === false) throw new Error(result.error || "Couldn't save your feedback.");
  if (result.rating !== 1 && result.rating !== -1) return null;
  return {
    rating: result.rating,
    reasons: Array.isArray(result.reasons)
      ? result.reasons.filter((reason): reason is string => typeof reason === "string")
      : [],
  };
}
