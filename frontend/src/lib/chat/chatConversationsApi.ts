import { supabase } from "@/integrations/supabase/client";
import type { ChatComposerMode } from "@/components/chat/types";
import { CHAT_COMPOSER_MODES } from "@/components/chat/types";
import { loadProfileRow } from "@/lib/userProfile/profileFieldPatch";
import {
  DEFAULT_CONVERSATION_TITLE,
  isDefaultConversationTitle,
} from "../../../../supabase/functions/chat/prompt/conversationTitle.ts";

export { DEFAULT_CONVERSATION_TITLE, isDefaultConversationTitle };

/** Stored in profiles.onboardingData when chatconversation table is absent. */
export const CHAT_CONVERSATIONS_ONBOARDING_KEY = "chat_conversations" as const;
const DEFAULT_PREVIEW_TEXT = "Start a conversation when you're ready.";

export interface ConversationListItem {
  id: string;
  title: string;
  previewText: string;
  modifiedDate: string | null;
  /** Composer quick-prompt mode stored on conversation context (bTIRi). */
  coaching_mode?: ChatComposerMode;
}

type ConversationRow = {
  id: string;
  title?: string | null;
  modifiedDate?: string | null;
  updatedAt?: string | null;
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

function isChatComposerMode(value: unknown): value is ChatComposerMode {
  return CHAT_COMPOSER_MODES.some((mode) => mode.id === value);
}

function mapConversationRow(
  row: ConversationRow,
  previewText = "",
  coachingMode?: ChatComposerMode,
): ConversationListItem {
  return {
    id: row.id,
    title: (row.title ?? "").trim() || DEFAULT_CONVERSATION_TITLE,
    previewText: previewText.trim() || DEFAULT_PREVIEW_TEXT,
    modifiedDate: row.modifiedDate ?? row.updatedAt ?? null,
    coaching_mode: coachingMode,
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
          title: typeof entry.title === "string" ? entry.title : null,
          modifiedDate:
            typeof entry.modifiedDate === "string" ? entry.modifiedDate : null,
        },
        typeof entry.previewText === "string" ? entry.previewText : "",
        isChatComposerMode(entry.coaching_mode) ? entry.coaching_mode : undefined,
      ),
    )
    .sort((a, b) => {
      const aTime = a.modifiedDate ? Date.parse(a.modifiedDate) : 0;
      const bTime = b.modifiedDate ? Date.parse(b.modifiedDate) : 0;
      return bTime - aTime;
    });
}

type OnboardingConversationRow = {
  id: string;
  title: string;
  previewText: string;
  modifiedDate: string | null;
  coaching_mode?: ChatComposerMode;
};

function toOnboardingRow(item: ConversationListItem): OnboardingConversationRow {
  return {
    id: item.id,
    title: item.title,
    previewText: item.previewText,
    modifiedDate: item.modifiedDate,
    coaching_mode: item.coaching_mode,
  };
}

async function persistOnboardingConversations(
  userId: string,
  updater: (rows: OnboardingConversationRow[]) => OnboardingConversationRow[],
): Promise<void> {
  const { onboardingData } = await loadProfileRow(userId);
  const existing = readOnboardingConversations(onboardingData).map(toOnboardingRow);
  const nextRows = updater(existing);

  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...onboardingData,
        [CHAT_CONVERSATIONS_ONBOARDING_KEY]: nextRows,
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
    .from("chatMessage")
    .select("conversationId, content, sender, id")
    .in("conversationId", conversationIds)
    .order("createdAt", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return previews;
    throw error;
  }

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const conversationId = record.conversationId;
    if (typeof conversationId !== "string" || previews.has(conversationId)) continue;
    const content =
      typeof record.content === "string"
        ? record.content
        : typeof record.sender === "string"
          ? record.sender
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
    .from("chatConversation")
    .select("id, title, updatedAt")
    .eq("userId", userId)
    .order("updatedAt", { ascending: false });

  if (error && isSchemaUnavailable(error)) {
    const fallback = await client
      .from("chatConversation")
      .select("id, title")
      .eq("userId", userId)
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
 * Tries chatconversation table; falls back to profiles.onboardingData when absent.
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
    .from("chatConversation")
    .insert({
      title: title,
      userId: userId,
    })
    .select("id, title, updatedAt")
    .single();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return mapConversationRow(data as ConversationRow);
}

/**
 * Create a chatconversation — table row or onboardingData fallback (bTInY NewThing parity).
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
      title: title,
      modifiedDate: now,
    },
    DEFAULT_PREVIEW_TEXT,
  );

  await persistOnboardingConversations(userId, (rows) => [toOnboardingRow(nextItem), ...rows]);
  return nextItem;
}

async function tryDeleteMessagesForConversation(
  conversationId: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("chatMessage")
    .delete()
    .eq("conversationId", conversationId);

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
    .from("chatConversation")
    .delete()
    .eq("id", conversationId)
    .eq("userId", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return true;
}

/**
 * Delete a chatconversation — table row or onboardingData fallback.
 */
export async function deleteConversation(
  userId: string,
  conversationId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<void> {
  const tableResult = await tryDeleteFromConversationTable(userId, conversationId);
  if (tableResult === true) return;

  if (tableResult === null) {
    await persistOnboardingConversations(userId, (rows) => {
      const nextRows = rows.filter((row) => row.id !== conversationId);
      if (nextRows.length === rows.length) throw new Error("Conversation not found");
      return nextRows;
    });
    return;
  }

  throw new Error("Conversation not found");
}

async function tryFetchConversationFromTable(
  userId: string,
  conversationId: string,
): Promise<ConversationListItem | "schema_unavailable" | null> {
  const client = supabase as unknown as UntypedSupabase;

  let { data, error } = await client
    .from("chatConversation")
    .select("id, title, updatedAt")
    .eq("id", conversationId)
    .eq("userId", userId)
    .maybeSingle();

  if (error && isSchemaUnavailable(error)) {
    const fallback = await client
      .from("chatConversation")
      .select("id, title")
      .eq("id", conversationId)
      .eq("userId", userId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isSchemaUnavailable(error)) return "schema_unavailable";
    throw error;
  }

  if (!data) return null;

  const row = data as ConversationRow;
  const previews = await fetchPreviewByConversation([row.id]);
  return mapConversationRow(row, previews.get(row.id) ?? "");
}

/**
 * Fetch a single chatconversation by id — table row or onboardingData fallback.
 */
export async function fetchConversationById(
  userId: string,
  conversationId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<ConversationListItem | null> {
  const fromTable = await tryFetchConversationFromTable(userId, conversationId);
  if (fromTable === "schema_unavailable") {
    return readOnboardingConversations(onboardingData).find((row) => row.id === conversationId) ?? null;
  }
  return fromTable;
}

/**
 * Persist composer coaching mode on conversation context (bTITI/bTITM/bTITN/bTITO → bTIRi).
 */
export async function updateConversationCoachingMode(
  userId: string,
  conversationId: string,
  mode: ChatComposerMode,
): Promise<void> {
  await persistOnboardingConversations(userId, (rows) => {
    let found = false;
    const nextRows = rows.map((row) => {
      if (row.id !== conversationId) return row;
      found = true;
      return { ...row, coaching_mode: mode };
    });
    if (!found) throw new Error("Conversation not found");
    return nextRows;
  });
}

async function tryRenameInConversationTable(
  userId: string,
  conversationId: string,
  title: string,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("chatConversation")
    .update({ title: title })
    .eq("id", conversationId)
    .eq("userId", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return data !== null;
}

/**
 * Rename a chatconversation — table row or onboardingData fallback.
 */
export async function renameConversation(
  userId: string,
  conversationId: string,
  title: string,
): Promise<void> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("Title is required");

  const fromTable = await tryRenameInConversationTable(userId, conversationId, trimmedTitle);
  if (fromTable === true) {
    await persistOnboardingConversations(userId, (rows) => {
      let found = false;
      const nextRows = rows.map((row) => {
        if (row.id !== conversationId) return row;
        found = true;
        return { ...row, title: trimmedTitle };
      });
      return found ? nextRows : rows;
    });
    return;
  }

  if (fromTable === null || fromTable === false) {
    await persistOnboardingConversations(userId, (rows) => {
      let found = false;
      const nextRows = rows.map((row) => {
        if (row.id !== conversationId) return row;
        found = true;
        return { ...row, title: trimmedTitle };
      });
      if (!found) throw new Error("Conversation not found");
      return nextRows;
    });
    return;
  }

  throw new Error("Conversation not found");
}

/**
 * Bump conversation preview + modifiedDate after a new message (sidebar parity).
 */
export async function touchConversationAfterMessage(
  userId: string,
  conversationId: string,
  previewText: string,
): Promise<void> {
  const now = new Date().toISOString();
  const trimmedPreview = previewText.trim() || DEFAULT_PREVIEW_TEXT;

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client
    .from("chatConversation")
    .update({ updatedAt: now })
    .eq("id", conversationId)
    .eq("userId", userId);

  if (tableError && !isSchemaUnavailable(tableError)) {
    throw tableError;
  }

  await persistOnboardingConversations(userId, (rows) => {
    let found = false;
    const nextRows = rows.map((row) => {
      if (row.id !== conversationId) return row;
      found = true;
      return {
        ...row,
        previewText: trimmedPreview,
        modifiedDate: now,
      };
    });
    if (!found) return rows;
    return nextRows.sort((a, b) => {
      const aTime = a.modifiedDate ? Date.parse(a.modifiedDate) : 0;
      const bTime = b.modifiedDate ? Date.parse(b.modifiedDate) : 0;
      return bTime - aTime;
    });
  });
}
