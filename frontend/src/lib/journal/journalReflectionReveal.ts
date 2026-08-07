/** sessionStorage key: entry ids whose Kota reflection stays hidden until the next Journal visit. */
export const JOURNAL_REFLECTION_PENDING_REVEAL_KEY =
  "journal_reflection_pending_reveal" as const;

function readPendingIds(): string[] {
  try {
    const raw = sessionStorage.getItem(JOURNAL_REFLECTION_PENDING_REVEAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && Boolean(id));
  } catch {
    return [];
  }
}

function writePendingIds(ids: string[]): void {
  try {
    if (ids.length === 0) {
      sessionStorage.removeItem(JOURNAL_REFLECTION_PENDING_REVEAL_KEY);
      return;
    }
    sessionStorage.setItem(JOURNAL_REFLECTION_PENDING_REVEAL_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / blocked storage */
  }
}

/** Hide Kota reflection UI for this entry until the next Journal page visit. */
export function markJournalReflectionPendingReveal(entryId: string): void {
  const id = entryId.trim();
  if (!id) return;
  const current = readPendingIds();
  if (current.includes(id)) return;
  writePendingIds([...current, id]);
}

export function isJournalReflectionRevealPending(entryId: string): boolean {
  const id = entryId.trim();
  if (!id) return false;
  return readPendingIds().includes(id);
}

/** Call on Journal mount so reflections marked this visit become visible next visit / reload. */
export function clearJournalReflectionPendingReveals(): void {
  try {
    sessionStorage.removeItem(JOURNAL_REFLECTION_PENDING_REVEAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Whether list/detail may show the stored Kota reflection for this entry. */
export function shouldShowJournalReflection(entry: {
  id: string;
  reflectionReady?: boolean;
  aiReflection?: string | null;
  has_ai_reflection?: boolean;
}): boolean {
  if (isJournalReflectionRevealPending(entry.id)) return false;
  if (entry.has_ai_reflection === true) return true;
  const text = entry.aiReflection?.trim();
  return Boolean(entry.reflectionReady && text);
}
