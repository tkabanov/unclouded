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

function shouldUseOnboardingStorage(error: { code?: string; message?: string }): boolean {
  if (isSchemaUnavailable(error)) return true;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42501" ||
    message.includes("row-level security") ||
    message.includes("foreign key constraint") ||
    message.includes("violates foreign key")
  );
}

function mapMessageRow(row: Record<string, unknown>): ChatMessage | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;

  const sender = typeof row.sender === "string" ? row.sender.toLowerCase() : "";
  const role: ChatMessage["role"] =
    sender === "assistant" || sender === "ai" ? "assistant" : "user";

  const content =
    typeof row.content === "string"
      ? row.content
      : typeof row.sender === "string"
        ? row.sender
        : "";

  return {
    id,
    role,
    content: content.trim(),
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
  const { onboardingData } = await loadProfileRow(userId);
  const store = readOnboardingMessages(onboardingData);
  const nextStore = updater(store);

  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...onboardingData,
        [CHAT_MESSAGES_ONBOARDING_KEY]: nextStore,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function tryInsertMessageRow(
  conversationId: string,
  userId: string,
  role: ChatMessage["role"],
  content: string,
): Promise<ChatMessage | null> {
  const client = supabase as unknown as UntypedSupabase;
  const sender = role === "assistant" ? "assistant" : "user";
  const { data, error } = await client
    .from("chatMessage")
    .insert({
      conversationId: conversationId,
      content: content,
      sender: sender,
      userId: userId,
      isFromUser: role === "user",
    })
    .select("id, content, sender")
    .single();

  if (error) {
    if (shouldUseOnboardingStorage(error)) return null;
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
    .from("chatMessage")
    .select("id, content, sender, conversationId")
    .eq("conversationId", conversationId)
    .order("createdAt", { ascending: true });

  if (!error) {
    return (data ?? [])
      .map((row) => mapMessageRow(row as Record<string, unknown>))
      .filter((message): message is ChatMessage => message !== null);
  }

  if (!isSchemaUnavailable(error)) throw error;
  return readOnboardingMessages(onboardingData)[conversationId] ?? [];
}

/**
 * Insert a user chatmessage row (table or onboardingData fallback).
 */
export async function insertUserMessage(params: {
  conversationId: string;
  userId: string;
  content: string;
  onboardingData?: Record<string, unknown> | null;
}): Promise<ChatMessage> {
  const trimmed = params.content.trim();
  if (!trimmed) throw new Error("Message content is required");

  const fromTable = await tryInsertMessageRow(params.conversationId, params.userId, "user", trimmed);
  if (fromTable) return fromTable;

  const nextMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: trimmed,
  };
  await persistOnboardingMessages(params.userId, (store) => ({
    ...store,
    [params.conversationId]: [...(store[params.conversationId] ?? []), nextMessage],
  }));
  return nextMessage;
}

/**
 * Insert an assistant chatmessage row (table or onboardingData fallback).
 */
export async function insertAssistantMessage(params: {
  conversationId: string;
  userId: string;
  content: string;
  onboardingData?: Record<string, unknown> | null;
}): Promise<ChatMessage> {
  const trimmed = params.content.trim();
  if (!trimmed) throw new Error("Assistant content is required");

  const fromTable = await tryInsertMessageRow(params.conversationId, params.userId, "assistant", trimmed);
  if (fromTable) return fromTable;

  const nextMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: trimmed,
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

  const { onboardingData } = await loadProfileRow(params.userId);
  return fetchMessagesForConversation(params.conversationId, onboardingData);
}
