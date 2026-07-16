import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable, parseBoolean } from "@/lib/supabase/schemaFallback";

/** Stored in profiles.onboardingData when resource / uds_resource tables are absent. */
export const RESOURCES_ONBOARDING_KEY = "resources" as const;

/** Row in paths resources RG (ai_RNbBHYIu) — custom.resource Search parity. */
export interface ResourceListItem {
  resourceId: string;
  title: string;
  content: string;
  primaryModeTag?: string;
  subModeTag?: string;
  isFree: boolean;
  sensitivityFlag?: string;
  externalLink?: string;
  isCrisisResource?: boolean;
}

type ResourceRow = {
  id?: string;
  title?: string;
  content?: string;
  primaryModeTag?: string;
  subModeTag?: string;
  isFree?: boolean | string | null;
  sensitivityFlag?: string;
  externalLink?: string;
  isCrisisResource?: boolean | string | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function toListItem(row: ResourceRow): ResourceListItem | null {
  if (!row.id) return null;
  const title = row.title?.trim();
  if (!title) return null;

  return {
    resourceId: row.id,
    title,
    content: row.content?.trim() ?? "",
    primaryModeTag: row.primaryModeTag?.trim() || undefined,
    subModeTag: row.subModeTag?.trim() || undefined,
    isFree: parseBoolean(row.isFree),
    sensitivityFlag: row.sensitivityFlag?.trim() || undefined,
    externalLink: row.externalLink?.trim() || undefined,
    isCrisisResource: parseBoolean(row.isCrisisResource),
  };
}

function readOnboardingResources(
  onboardingData: Record<string, unknown> | null | undefined,
): ResourceListItem[] {
  const raw = onboardingData?.[RESOURCES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      return toListItem(entry as ResourceRow);
    })
    .filter((item): item is ResourceListItem => item !== null);
}

async function tryFetchFromTable(table: string): Promise<ResourceListItem[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from(table)
    .select(
      "id, title, content, primaryModeTag, subModeTag, isFree, sensitivityFlag, externalLink, isCrisisResource",
    )
    .eq("isCrisisResource", false);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toListItem(row as ResourceRow))
    .filter((item): item is ResourceListItem => item !== null);
}

/**
 * Bubble ai_RNbBHYIu binding: Search custom.resource rows for paths library cards.
 * Tries resource then uds_resource; falls back to onboardingData.resources.
 */
export async function fetchResources(
  onboardingData?: Record<string, unknown> | null,
): Promise<ResourceListItem[]> {
  const fromResource = await tryFetchFromTable("resource");
  if (fromResource !== null) return fromResource;

  const fromUds = await tryFetchFromTable("uds_resource");
  if (fromUds !== null) return fromUds;

  return readOnboardingResources(onboardingData);
}
