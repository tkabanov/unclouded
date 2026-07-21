import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  buildStaticPromptLayerMap,
  STATIC_PROMPT_LAYER_ENTRIES,
  type PromptLibraryLayerMap,
} from "./promptLibraryStaticLayers.ts";

export type PromptLibraryVersionStatus = "draft" | "approved" | "production";

export type PromptLibraryVersionRow = {
  id: string;
  status: PromptLibraryVersionStatus;
  label: string;
  approvedAt?: string | null;
  promotedAt?: string | null;
};

const layerCache = new Map<string, { loadedAt: number; layers: PromptLibraryLayerMap }>();
const CACHE_TTL_MS = 60_000;

function readCachedLayers(versionId: string): PromptLibraryLayerMap | null {
  const cached = layerCache.get(versionId);
  if (!cached) return null;
  if (Date.now() - cached.loadedAt > CACHE_TTL_MS) {
    layerCache.delete(versionId);
    return null;
  }
  return cached.layers;
}

function writeCachedLayers(versionId: string, layers: PromptLibraryLayerMap): void {
  layerCache.set(versionId, { loadedAt: Date.now(), layers });
}

export function clearPromptLibraryLayerCache(): void {
  layerCache.clear();
}

async function fetchLayersForVersion(
  supabase: SupabaseClient,
  versionId: string,
): Promise<PromptLibraryLayerMap> {
  const cached = readCachedLayers(versionId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("promptLibraryLayer")
    .select("layerKey, content")
    .eq("versionId", versionId);

  if (error) {
    if (error.code === "42P01") return buildStaticPromptLayerMap();
    throw error;
  }

  const layers = buildStaticPromptLayerMap();
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const layerKey = typeof record.layerKey === "string" ? record.layerKey : "";
    const content = typeof record.content === "string" ? record.content : "";
    if (layerKey && content.trim()) {
      layers[layerKey] = content;
    }
  }

  writeCachedLayers(versionId, layers);
  return layers;
}

export async function fetchPromptLibraryVersionByStatus(
  supabase: SupabaseClient,
  status: PromptLibraryVersionStatus,
): Promise<PromptLibraryVersionRow | null> {
  const { data, error } = await supabase
    .from("promptLibraryVersion")
    .select("id, status, label, approvedAt, promotedAt")
    .eq("status", status)
    .order("updatedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw error;
  }

  if (!data || typeof data.id !== "string") return null;
  return data as PromptLibraryVersionRow;
}

export async function fetchLatestDraftPromptLibraryVersion(
  supabase: SupabaseClient,
): Promise<PromptLibraryVersionRow | null> {
  const { data, error } = await supabase
    .from("promptLibraryVersion")
    .select("id, status, label, approvedAt, promotedAt")
    .eq("status", "draft")
    .order("updatedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw error;
  }

  if (!data || typeof data.id !== "string") return null;
  return data as PromptLibraryVersionRow;
}

export async function ensureProductionPromptLibrarySeeded(
  supabase: SupabaseClient,
  createdBy?: string | null,
): Promise<PromptLibraryVersionRow> {
  const existing = await fetchPromptLibraryVersionByStatus(supabase, "production");
  if (existing) return existing;

  const { data: version, error: versionError } = await supabase
    .from("promptLibraryVersion")
    .insert({
      status: "production",
      label: "Production v1 (seeded from code)",
      createdBy: createdBy ?? null,
      promotedAt: new Date().toISOString(),
    })
    .select("id, status, label, approvedAt, promotedAt")
    .single();

  if (versionError || !version) {
    throw versionError ?? new Error("Failed to seed production prompt library version");
  }

  const versionId = (version as { id: string }).id;
  const layerRows = STATIC_PROMPT_LAYER_ENTRIES.map((entry) => ({
    versionId,
    layerKey: entry.layerKey,
    content: entry.content,
    sortOrder: entry.sortOrder,
  }));

  const { error: layerError } = await supabase.from("promptLibraryLayer").insert(layerRows);
  if (layerError) throw layerError;

  clearPromptLibraryLayerCache();
  return version as PromptLibraryVersionRow;
}

export type ResolvePromptLibraryOptions = {
  versionId?: string | null;
  preferDraft?: boolean;
  createdBy?: string | null;
};

/** Resolve DB-backed prompt layers; lazy-seeds production from TS fallbacks when empty. */
export async function resolvePromptLibraryLayers(
  supabase: SupabaseClient,
  options: ResolvePromptLibraryOptions = {},
): Promise<{ version: PromptLibraryVersionRow | null; layers: PromptLibraryLayerMap }> {
  const envVersionId = Deno.env.get("PROMPT_LIBRARY_VERSION_ID")?.trim();
  const explicitVersionId = options.versionId?.trim() || envVersionId || null;

  try {
    if (explicitVersionId) {
      const layers = await fetchLayersForVersion(supabase, explicitVersionId);
      return {
        version: {
          id: explicitVersionId,
          status: options.preferDraft ? "draft" : "production",
          label: "explicit",
        },
        layers,
      };
    }

    if (options.preferDraft) {
      const draft = await fetchLatestDraftPromptLibraryVersion(supabase);
      if (draft) {
        const layers = await fetchLayersForVersion(supabase, draft.id);
        return { version: draft, layers };
      }
    }

    const production = await ensureProductionPromptLibrarySeeded(supabase, options.createdBy ?? null);
    const layers = await fetchLayersForVersion(supabase, production.id);
    return { version: production, layers };
  } catch (err) {
    console.warn("resolvePromptLibraryLayers fallback to static layers", err);
    return { version: null, layers: buildStaticPromptLayerMap() };
  }
}

export async function clonePromptLibraryVersionFromProduction(
  supabase: SupabaseClient,
  createdBy: string,
  label: string,
): Promise<PromptLibraryVersionRow> {
  const production = await ensureProductionPromptLibrarySeeded(supabase, createdBy);
  const productionLayers = await fetchLayersForVersion(supabase, production.id);

  const { data: draft, error: draftError } = await supabase
    .from("promptLibraryVersion")
    .insert({
      status: "draft",
      label,
      createdBy,
    })
    .select("id, status, label, approvedAt, promotedAt")
    .single();

  if (draftError || !draft) {
    throw draftError ?? new Error("Failed to create draft prompt library version");
  }

  const draftId = (draft as { id: string }).id;
  const layerRows = Object.entries(productionLayers).map(([layerKey, content], index) => ({
    versionId: draftId,
    layerKey,
    content,
    sortOrder: index,
  }));

  const { error: layerError } = await supabase.from("promptLibraryLayer").insert(layerRows);
  if (layerError) throw layerError;

  clearPromptLibraryLayerCache();
  return draft as PromptLibraryVersionRow;
}
