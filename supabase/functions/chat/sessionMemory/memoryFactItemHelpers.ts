/** REQ-01 — per-item dates for longitudinal memory aging (Block 3.29). */

const DATED_ITEM_RE = /^(\d{4}-\d{2}-\d{2})\|(.+)$/s;

export function toMemoryFactDateKey(referenceDate: Date = new Date()): string {
  return referenceDate.toISOString().slice(0, 10);
}

export function stampMemoryFactItem(text: string, dateKey: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(DATED_ITEM_RE);
  if (match) return `${match[1]}|${match[2].trim()}`;
  return `${dateKey}|${trimmed}`;
}

export function splitStoredMemoryFactItems(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinMemoryFactItems(items: string[]): string | null {
  const capped = items.map((item) => item.trim()).filter(Boolean).slice(0, 5);
  return capped.length > 0 ? capped.join("\n") : null;
}

export function formatMemoryFactItemsForPrompt(
  label: string,
  value: string | null | undefined,
): string | null {
  const items = splitStoredMemoryFactItems(value);
  if (items.length === 0) return null;

  const formatted = items.map((item) => {
    const match = item.match(DATED_ITEM_RE);
    if (match) {
      return `${match[1]} — ${match[2].trim()}`;
    }
    return item;
  });

  return `${label}: ${formatted.join(" / ")}`;
}

/** Merge incoming facts (stamped with dateKey) ahead of existing dated items. */
export function mergeMemoryFactFieldWithDates(
  existing: string | null | undefined,
  incoming: string | null | undefined,
  dateKey: string,
): string | null {
  const existingItems = splitStoredMemoryFactItems(existing);
  const incomingItems = splitStoredMemoryFactItems(incoming).map((item) =>
    stampMemoryFactItem(item, dateKey),
  );

  const seen = new Set<string>();
  const merged: string[] = [];

  for (const item of incomingItems) {
    const contentKey = item.replace(DATED_ITEM_RE, "$2").trim().toLowerCase();
    if (!contentKey || seen.has(contentKey)) continue;
    seen.add(contentKey);
    merged.push(item);
    if (merged.length >= 5) return joinMemoryFactItems(merged);
  }

  for (const item of existingItems) {
    const contentKey = item.replace(DATED_ITEM_RE, "$2").trim().toLowerCase();
    if (!contentKey || seen.has(contentKey)) continue;
    seen.add(contentKey);
    merged.push(item);
    if (merged.length >= 5) break;
  }

  return joinMemoryFactItems(merged);
}
