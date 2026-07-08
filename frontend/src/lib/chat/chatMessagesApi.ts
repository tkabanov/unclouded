import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/components/chat/types";

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function isSchemaUnavailable(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("column")
  );
}

function mapMessageRow(row: Record<string, unknown>): ChatMessage | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;

  const sender = typeof row.sender_text === "string" ? row.sender_text.toLowerCase() : "";
  const role: ChatMessage["role"] =
    sender === "assistant" || sender === "ai" ? "assistant" : "user";

  const content =
    typeof row.content_text === "string"
      ? row.content_text
      : typeof row.sender_text === "string"
        ? row.sender_text
        : "";

  return {
    id,
    role,
    content_text: content.trim(),
  };
}

/**
 * Load chatmessage rows for a conversation — read path for CHAT-03 panel mount.
 * Send/insert flows are owned by CHAT-05.
 */
export async function fetchMessagesForConversation(
  conversationId: string,
): Promise<ChatMessage[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("chatmessage")
    .select("id, content_text, sender_text, conversation_custom_chatconversation")
    .eq("conversation_custom_chatconversation", conversationId)
    .order("id", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  return (data ?? [])
    .map((row) => mapMessageRow(row as Record<string, unknown>))
    .filter((message): message is ChatMessage => message !== null);
}
