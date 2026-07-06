import type { DeterministicCoverDraft, InventoryFile } from "../types.js";

const DETERMINISTIC_CLASSES = new Set([
  "settings_singleton",
  "style",
  "color_token",
  "font_token",
  "plugin",
]);

export function buildDeterministicCover(inventory: InventoryFile): DeterministicCoverDraft {
  const coveredIds = inventory.entries
    .filter((entry) => DETERMINISTIC_CLASSES.has(entry.entity_class))
    .map((entry) => entry.id)
    .sort();

  return {
    slice_id: "_deterministic",
    covered_ids: coveredIds,
    prose_template: [
      "Deterministic cover owns settings client_safe singletons and style/token/plugin collections.",
    ],
  };
}

export function expectedDeterministicInventoryIds(inventory: InventoryFile): string[] {
  return inventory.entries
    .filter((entry) => DETERMINISTIC_CLASSES.has(entry.entity_class))
    .map((entry) => entry.id)
    .sort();
}
