import type { BubbleRoot, InventoryFile, ResolverEntry, ResolverFile } from "./types.js";
import { getRecord, getString, shortHash } from "./utils/index.js";

function valueAtPointer(root: BubbleRoot, pointer: string): unknown {
  const parts = pointer
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  let cursor: unknown = root;
  for (const part of parts) {
    if (Array.isArray(cursor)) {
      const index = Number(part);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      cursor = cursor[index];
      continue;
    }
    if (!getRecord(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function computeRawDisplayName(root: BubbleRoot, pointer: string, id: string): string {
  const node = valueAtPointer(root, pointer);
  const record = getRecord(node);
  if (!record) {
    return id;
  }
  const candidates = [
    getString(record.display),
    getString(record.name),
    getString(record.title),
    getString(record.id),
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return id;
}

export function buildResolver(root: BubbleRoot, inventory: InventoryFile): ResolverFile {
  const provisional: Array<{ id: string; rawName: string }> = inventory.entries.map((entry) => ({
    id: entry.id,
    rawName: computeRawDisplayName(root, entry.pointer, entry.id),
  }));

  const byName = new Map<string, string[]>();
  for (const item of provisional) {
    const existing = byName.get(item.rawName) ?? [];
    existing.push(item.id);
    byName.set(item.rawName, existing);
  }

  const entries: ResolverEntry[] = provisional.map((item) => {
    const siblings = byName.get(item.rawName) ?? [];
    const suffix = shortHash(item.id, 6);
    const displayName =
      siblings.length > 1 ? `${item.rawName}__${suffix}` : item.rawName;
    return {
      id: item.id,
      display_name: displayName,
      short_hash: suffix,
    };
  });

  entries.sort((a, b) => a.id.localeCompare(b.id));

  const collisions: Record<string, string[]> = {};
  for (const [name, ids] of byName.entries()) {
    if (ids.length > 1) {
      collisions[name] = [...ids].sort();
    }
  }

  return { entries, collisions };
}
