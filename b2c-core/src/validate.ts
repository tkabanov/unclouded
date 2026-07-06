import type { BubbleRoot, InventoryFile, RefEdge } from "./types.js";
import { expectedDeterministicInventoryIds } from "./cover/deterministic.js";
import { getRecord, getString } from "./utils/index.js";

export interface ValidationResult {
  errors: string[];
}

function normalizePointer(rawPath: string): string {
  const withSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const compact = withSlash.slice(1);
  if (compact.includes("%") || (compact.includes(".") && !compact.includes("/"))) {
    const canonical = compact
      .replace(/^%p3\./, "pages.")
      .replace(/^%ed\./, "element_definitions.")
      .replace(/^%api\./, "api.")
      .replace(/\.%el\./g, ".elements.")
      .replace(/\.%wf\./g, ".workflows.");
    const parts = canonical.split(".").filter((part) => part.length > 0);
    return `/${parts.join("/")}`;
  }
  return withSlash;
}

export function validateIndexSubset(root: BubbleRoot, inventory: InventoryFile): ValidationResult {
  const errors: string[] = [];
  const idToPath = root._index?.id_to_path ?? {};
  const pointersById = new Map<string, Set<string>>();
  for (const entry of inventory.entries) {
    if (!pointersById.has(entry.id)) {
      pointersById.set(entry.id, new Set<string>());
    }
    pointersById.get(entry.id)?.add(entry.pointer);
  }
  for (const [id, rawPath] of Object.entries(idToPath)) {
    const pointers = pointersById.get(id);
    if (!pointers || pointers.size === 0) {
      errors.push(`_index.id_to_path id missing in inventory: ${id}`);
      continue;
    }
    if (typeof rawPath !== "string") {
      errors.push(`_index.id_to_path has non-string path for id: ${id}`);
      continue;
    }
    const expectedPointer = normalizePointer(rawPath);
    if (!pointers.has(expectedPointer)) {
      errors.push(
        `_index.id_to_path pointer mismatch for ${id}: expected ${expectedPointer}, got ${Array.from(
          pointers,
        ).join(", ")}`,
      );
    }
  }
  return { errors };
}

export function validateRefs(inventory: InventoryFile, refs: RefEdge[]): ValidationResult {
  const errors: string[] = [];
  const ids = new Set(inventory.entries.map((entry) => entry.id));
  for (const edge of refs) {
    if (!ids.has(edge.from_id)) {
      errors.push(`Dangling edge.from_id: ${edge.from_id}`);
    }
    if (!ids.has(edge.to_id)) {
      errors.push(`Dangling edge.to_id: ${edge.to_id}`);
    }
  }
  return { errors };
}

export function validateOAuthRefs(root: BubbleRoot, refs: RefEdge[]): ValidationResult {
  const errors: string[] = [];
  const apiConnector = getRecord(root.settings?.client_safe?.apiconnector2);
  if (!apiConnector) {
    return { errors };
  }

  for (const [nsId, nsUnknown] of Object.entries(apiConnector)) {
    const ns = getRecord(nsUnknown);
    if (!ns || getString(ns.auth) !== "oauth2_user") {
      continue;
    }
    const hasKey = Object.hasOwn(ns, "oauth_user_data_call");
    const oauthCallUrl = getString(ns.oauth_user_data_call);
    if (!hasKey || !oauthCallUrl) {
      continue;
    }
    const fromId = `external_ns:${nsId}`;
    const hasEdge = refs.some(
      (edge) => edge.edge_kind === "oauth_user_data_call" && edge.from_id === fromId,
    );
    if (!hasEdge) {
      errors.push(`Missing oauth_user_data_call edge for namespace ${nsId}`);
    }
  }
  return { errors };
}

export function validateDeterministicSetEquality(
  inventory: InventoryFile,
  deterministicCoveredIds: string[],
): ValidationResult {
  const expected = expectedDeterministicInventoryIds(inventory);
  const expectedSet = new Set(expected);
  const gotSet = new Set(deterministicCoveredIds);
  const errors: string[] = [];
  for (const id of expectedSet) {
    if (!gotSet.has(id)) {
      errors.push(`Deterministic cover missing id: ${id}`);
    }
  }
  for (const id of gotSet) {
    if (!expectedSet.has(id)) {
      errors.push(`Deterministic cover has unexpected id: ${id}`);
    }
  }
  return { errors };
}
