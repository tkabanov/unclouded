import { supabase } from "@/integrations/supabase/client";

/** Fallback when chatmessage / chatconversation tables are absent from prototype schema. */
export const CHAT_PREVIEW_ONBOARDING_KEY = "chat_preview" as const;
export const CHAT_MESSAGES_ONBOARDING_KEY = "chat_messages" as const;

export interface ChatPreviewData {
  conversationTitle: string;
  lastMessageText: string;
}

const DEFAULT_CONVERSATION_TITLE = "Your AI Coach";
const DEFAULT_LAST_MESSAGE =
  "Here whenever you need to think out loud — start a conversation when you're ready.";

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
    message.includes("could not find the table")
  );
}

function readPreviewFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): ChatPreviewData | null {
  const preview = onboardingData?.[CHAT_PREVIEW_ONBOARDING_KEY];
  if (preview && typeof preview === "object") {
    const row = preview as Record<string, unknown>;
    const lastMessageText =
      typeof row.last_message_text === "string" ? row.last_message_text.trim() : "";
    const conversationTitle =
      typeof row.conversation_title_text === "string"
        ? row.conversation_title_text.trim()
        : typeof row.title_text === "string"
          ? row.title_text.trim()
          : "";
    if (lastMessageText || conversationTitle) {
      return {
        conversationTitle: conversationTitle || DEFAULT_CONVERSATION_TITLE,
        lastMessageText: lastMessageText || DEFAULT_LAST_MESSAGE,
      };
    }
  }

  const messages = onboardingData?.[CHAT_MESSAGES_ONBOARDING_KEY];
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const parsed = messages
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const content =
        typeof row.content_text === "string"
          ? row.content_text
          : typeof row.sender_text === "string"
            ? row.sender_text
            : "";
      if (!content.trim()) return null;
      return {
        id: typeof row.id === "string" ? row.id : `onboarding-${index}`,
        content_text: content.trim(),
        conversation_title:
          typeof row.conversation_title_text === "string"
            ? row.conversation_title_text
            : typeof row.title_text === "string"
              ? row.title_text
              : "",
      };
    })
    .filter((row): row is { id: string; content_text: string; conversation_title: string } => row !== null);

  if (parsed.length === 0) return null;
  const last = parsed[parsed.length - 1];
  return {
    conversationTitle: last.conversation_title.trim() || DEFAULT_CONVERSATION_TITLE,
    lastMessageText: last.content_text,
  };
}

async function tryFetchConversationTitle(userId: string): Promise<string | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("chatconversation")
    .select("title_text")
    .eq("user_user", userId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!data || typeof data !== "object") return null;
  const title = (data as Record<string, unknown>).title_text;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

async function tryFetchLastMessage(userId: string): Promise<string | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("chatmessage")
    .select("content_text, sender_text")
    .eq("user_user", userId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const content =
    typeof row.content_text === "string"
      ? row.content_text
      : typeof row.sender_text === "string"
        ? row.sender_text
        : "";
  return content.trim() ? content.trim() : null;
}

/**
 * Load dashboard chat preview — last message text and conversation title for current user.
 * Tries Bubble chatmessage/chatconversation tables, then profiles.onboarding_data fallback.
 */
export async function fetchChatPreview(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<ChatPreviewData> {
  const [conversationTitle, lastMessageText] = await Promise.all([
    tryFetchConversationTitle(userId),
    tryFetchLastMessage(userId),
  ]);

  if (conversationTitle || lastMessageText) {
    return {
      conversationTitle: conversationTitle ?? DEFAULT_CONVERSATION_TITLE,
      lastMessageText: lastMessageText ?? DEFAULT_LAST_MESSAGE,
    };
  }

  const fromOnboarding = readPreviewFromOnboarding(onboardingData);
  if (fromOnboarding) return fromOnboarding;

  return {
    conversationTitle: DEFAULT_CONVERSATION_TITLE,
    lastMessageText: DEFAULT_LAST_MESSAGE,
  };
}
