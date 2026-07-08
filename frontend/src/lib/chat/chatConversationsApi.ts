import { supabase } from "@/integrations/supabase/client";

/** Stored in profiles.onboarding_data when chatconversation table is absent. */
export const CHAT_CONVERSATIONS_ONBOARDING_KEY = "chat_conversations" as const;

const DEFAULT_CONVERSATION_TITLE = "New conversation";
const DEFAULT_PREVIEW_TEXT = "Start a conversation when you're ready.";

export interface ConversationListItem {
  id: string;
  title_text: string;
  preview_text: string;
  modified_date: string | null;
}

type ConversationRow = {
  id: string;
  title_text?: string | null;
  modified_date?: string | null;
};

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

function mapConversationRow(
  row: ConversationRow,
  previewText = "",
): ConversationListItem {
  return {
    id: row.id,
    title_text: (row.title_text ?? "").trim() || DEFAULT_CONVERSATION_TITLE,
    preview_text: previewText.trim() || DEFAULT_PREVIEW_TEXT,
    modified_date: row.modified_date ?? null,
  };
}

function readOnboardingConversations(
  onboardingData: Record<string, unknown> | null | undefined,
): ConversationListItem[] {
  const raw = onboardingData?.[CHAT_CONVERSATIONS_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry) =>
      mapConversationRow(
        {
          id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
          title_text: typeof entry.title_text === "string" ? entry.title_text : null,
          modified_date:
            typeof entry.modified_date === "string" ? entry.modified_date : null,
        },
        typeof entry.preview_text === "string" ? entry.preview_text : "",
      ),
    )
    .sort((a, b) => {
      const aTime = a.modified_date ? Date.parse(a.modified_date) : 0;
      const bTime = b.modified_date ? Date.parse(b.modified_date) : 0;
      return bTime - aTime;
    });
}

type OnboardingConversationRow = {
  id: string;
  title_text: string;
  preview_text: string;
  modified_date: string | null;
};

function toOnboardingRow(item: ConversationListItem): OnboardingConversationRow {
  return {
    id: item.id,
    title_text: item.title_text,
    preview_text: item.preview_text,
    modified_date: item.modified_date,
  };
}

async function persistOnboardingConversations(
  userId: string,
  conversations: OnboardingConversationRow[],
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_data: {
        ...(onboardingData ?? {}),
        [CHAT_CONVERSATIONS_ONBOARDING_KEY]: conversations,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function fetchPreviewByConversation(
  conversationIds: string[],
): Promise<Map<string, string>> {
  const previews = new Map<string, string>();
  if (conversationIds.length === 0) return previews;

  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("chatmessage")
    .select("conversation_custom_chatconversation, content_text, sender_text, id")
    .in("conversation_custom_chatconversation", conversationIds)
    .order("id", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return previews;
    throw error;
  }

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const conversationId = record.conversation_custom_chatconversation;
    if (typeof conversationId !== "string" || previews.has(conversationId)) continue;
    const content =
      typeof record.content_text === "string"
        ? record.content_text
        : typeof record.sender_text === "string"
          ? record.sender_text
          : "";
    if (content.trim()) previews.set(conversationId, content.trim());
  }

  return previews;
}

async function tryFetchFromConversationTable(
  userId: string,
): Promise<ConversationListItem[] | null> {
  const client = supabase as unknown as UntypedSupabase;

  let { data, error } = await client
    .from("chatconversation")
    .select("id, title_text, modified_date")
    .eq("user_user", userId)
    .order("modified_date", { ascending: false });

  if (error && isSchemaUnavailable(error)) {
    const fallback = await client
      .from("chatconversation")
      .select("id, title_text")
      .eq("user_user", userId)
      .order("id", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  const rows = (data ?? []) as ConversationRow[];
  const previews = await fetchPreviewByConversation(rows.map((row) => row.id));
  return rows.map((row) => mapConversationRow(row, previews.get(row.id) ?? ""));
}

/**
 * Current user's chat conversations — newest modified date first.
 * Tries chatconversation table; falls back to profiles.onboarding_data when absent.
 */
export async function fetchConversations(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<ConversationListItem[]> {
  const fromTable = await tryFetchFromConversationTable(userId);
  if (fromTable !== null) return fromTable;
  return readOnboardingConversations(onboardingData);
}

async function tryCreateInConversationTable(
  userId: string,
  title: string,
): Promise<ConversationListItem | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("chatconversation")
    .insert({
      title_text: title,
      user_user: userId,
    })
    .select("id, title_text, modified_date")
    .single();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return mapConversationRow(data as ConversationRow);
}

/**
 * Create a chatconversation — table row or onboarding_data fallback (bTInY NewThing parity).
 */
export async function createConversation(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
  title = DEFAULT_CONVERSATION_TITLE,
): Promise<ConversationListItem> {
  const fromTable = await tryCreateInConversationTable(userId, title);
  if (fromTable !== null) return fromTable;

  const now = new Date().toISOString();
  const nextItem = mapConversationRow(
    {
      id: crypto.randomUUID(),
      title_text: title,
      modified_date: now,
    },
    DEFAULT_PREVIEW_TEXT,
  );

  const existing = readOnboardingConversations(onboardingData).map(toOnboardingRow);
  await persistOnboardingConversations(
    userId,
    [toOnboardingRow(nextItem), ...existing],
    onboardingData,
  );
  return nextItem;
}

async function tryDeleteMessagesForConversation(
  conversationId: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("chatmessage")
    .delete()
    .eq("conversation_custom_chatconversation", conversationId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

async function tryDeleteFromConversationTable(
  userId: string,
  conversationId: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;

  const messagesResult = await tryDeleteMessagesForConversation(conversationId);
  if (messagesResult === null) {
    // chatmessage table absent — proceed with conversation delete only.
  }

  const { error } = await client
    .from("chatconversation")
    .delete()
    .eq("id", conversationId)
    .eq("user_user", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

/**
 * Delete a chatconversation — table row or onboarding_data fallback.
 */
export async function deleteConversation(
  userId: string,
  conversationId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const tableResult = await tryDeleteFromConversationTable(userId, conversationId);
  if (tableResult === true) return;

  if (tableResult === null) {
    const existing = readOnboardingConversations(onboardingData);
    const nextRows = existing
      .filter((row) => row.id !== conversationId)
      .map(toOnboardingRow);
    if (nextRows.length === existing.length) throw new Error("Conversation not found");
    await persistOnboardingConversations(userId, nextRows, onboardingData);
    return;
  }

  throw new Error("Conversation not found");
}
