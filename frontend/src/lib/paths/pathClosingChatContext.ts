/** sessionStorage key for path-completion → chat handoff (AIP-P3-002). */
export const PATH_CLOSING_CHAT_CONTEXT_KEY = "kota_path_closing_chat_context";

/** True when `context` carries a path-session closing handoff note. */
export function isPathClosingChatContext(context: string | null | undefined): boolean {
  if (!context?.trim()) return false;
  const lower = context.toLowerCase();
  return (
    lower.includes("just completed") &&
    lower.includes("wants to discuss something that came up")
  );
}

export function setPathClosingChatContext(note: string): void {
  const trimmed = note.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(PATH_CLOSING_CHAT_CONTEXT_KEY, trimmed);
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekPathClosingChatContext(): string | null {
  try {
    const value = sessionStorage.getItem(PATH_CLOSING_CHAT_CONTEXT_KEY);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

/** Read and clear the handoff note (one-shot). */
export function consumePathClosingChatContext(): string | null {
  const value = peekPathClosingChatContext();
  if (!value) return null;
  try {
    sessionStorage.removeItem(PATH_CLOSING_CHAT_CONTEXT_KEY);
  } catch {
    /* ignore */
  }
  return value;
}

export function clearPathClosingChatContext(): void {
  try {
    sessionStorage.removeItem(PATH_CLOSING_CHAT_CONTEXT_KEY);
  } catch {
    /* ignore */
  }
}

/** Merge profile context with a path-closing handoff note for the chat edge. */
export function mergeChatContextWithPathClosing(
  context: string | undefined,
  pathClosingNote: string | null | undefined,
): string | undefined {
  const parts = [context?.trim(), pathClosingNote?.trim()].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(". ") : undefined;
}
