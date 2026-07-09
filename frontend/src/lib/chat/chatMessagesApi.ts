import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/components/chat/types";
import { generateAiReplyStub } from "@/lib/chat/chatAiReplyStub";
import { touchConversationAfterMessage } from "@/lib/chat/chatConversationsApi";
import { loadProfileRow } from "@/lib/userProfile/profileFieldPatch";

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export const CHAT_MESSAGES_ONBOARDING_KEY = "chat_messages" as const;

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

function readOnboardingMessages(
  onboardingData: Record<string, unknown> | null | undefined,
): Record<string, ChatMessage[]> {
  const raw = onboardingData?.[CHAT_MESSAGES_ONBOARDING_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const map: Record<string, ChatMessage[]> = {};
  for (const [conversationId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    map[conversationId] = value
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
      .map((entry) => mapMessageRow({ ...entry, id: entry.id ?? crypto.randomUUID() }))
      .filter((message): message is ChatMessage => message !== null);
  }
  return map;
}

async function persistOnboardingMessages(
  userId: string,
  updater: (store: Record<string, ChatMessage[]>) => Record<string, ChatMessage[]>,
): Promise<void> {
  const { onboarding_data } = await loadProfileRow(userId);
  const store = readOnboardingMessages(onboarding_data);
  const nextStore = updater(store);

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_data: {
        ...onboarding_data,
        [CHAT_MESSAGES_ONBOARDING_KEY]: nextStore,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function tryInsertMessageRow(
  conversationId: string,
  role: ChatMessage["role"],
  content: string,
): Promise<ChatMessage | null> {
  const client = supabase as unknown as UntypedSupabase;
  const sender = role === "assistant" ? "assistant" : "user";
  const { data, error } = await client
    .from("chatmessage")
    .insert({
      conversation_custom_chatconversation: conversationId,
      content_text: content,
      sender_text: sender,
    })
    .select("id, content_text, sender_text")
    .single();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return mapMessageRow(data as Record<string, unknown>);
}

/**
 * Load chatmessage rows for a conversation.
 */
export async function fetchMessagesForConversation(
  conversationId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<ChatMessage[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("chatmessage")
    .select("id, content_text, sender_text, conversation_custom_chatconversation")
    .eq("conversation_custom_chatconversation", conversationId)
    .order("id", { ascending: true });

  if (!error) {
    return (data ?? [])
      .map((row) => mapMessageRow(row as Record<string, unknown>))
      .filter((message): message is ChatMessage => message !== null);
  }

  if (!isSchemaUnavailable(error)) throw error;
  return readOnboardingMessages(onboardingData)[conversationId] ?? [];
}

/**
 * Insert a user chatmessage row (table or onboarding_data fallback).
 */
export async function insertUserMessage(params: {
  conversationId: string;
  userId: string;
  content: string;
  onboardingData?: Record<string, unknown> | null;
}): Promise<ChatMessage> {
  const trimmed = params.content.trim();
  if (!trimmed) throw new Error("Message content is required");

  const fromTable = await tryInsertMessageRow(params.conversationId, "user", trimmed);
  if (fromTable) return fromTable;

  const nextMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content_text: trimmed,
  };
  await persistOnboardingMessages(params.userId, (store) => ({
    ...store,
    [params.conversationId]: [...(store[params.conversationId] ?? []), nextMessage],
  }));
  return nextMessage;
}

/**
 * Insert an assistant chatmessage row (table or onboarding_data fallback).
 */
export async function insertAssistantMessage(params: {
  conversationId: string;
  userId: string;
  content: string;
  onboardingData?: Record<string, unknown> | null;
}): Promise<ChatMessage> {
  const trimmed = params.content.trim();
  if (!trimmed) throw new Error("Assistant content is required");

  const fromTable = await tryInsertMessageRow(params.conversationId, "assistant", trimmed);
  if (fromTable) return fromTable;

  const nextMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content_text: trimmed,
  };
  await persistOnboardingMessages(params.userId, (store) => ({
    ...store,
    [params.conversationId]: [...(store[params.conversationId] ?? []), nextMessage],
  }));
  return nextMessage;
}

/**
 * bTITZ send parity — insert user message, request AI stub reply, insert assistant message.
 */
export async function sendMessageWithAiReply(params: {
  conversationId: string;
  userId: string;
  content: string;
  onboardingData?: Record<string, unknown> | null;
  context?: string;
  priorMessages?: ChatMessage[];
}): Promise<ChatMessage[]> {
  const userMessage = await insertUserMessage(params);
  const thread = [...(params.priorMessages ?? []), userMessage];
  const assistantText = await generateAiReplyStub(thread, params.context);
  await insertAssistantMessage({
    conversationId: params.conversationId,
    userId: params.userId,
    content: assistantText,
  });
  await touchConversationAfterMessage(params.userId, params.conversationId, assistantText);

  const { onboarding_data } = await loadProfileRow(params.userId);
  return fetchMessagesForConversation(params.conversationId, onboarding_data);
}
