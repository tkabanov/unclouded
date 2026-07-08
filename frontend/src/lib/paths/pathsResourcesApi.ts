import { supabase } from "@/integrations/supabase/client";

/** Stored in profiles.onboarding_data when resource / uds_resource tables are absent. */
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
  title_text?: string;
  content_text?: string;
  primary_mode_tag_text?: string;
  sub_mode_tag_text?: string;
  is_free_boolean?: boolean | string | null;
  sensitivity_flag_text?: string;
  external_link_text?: string;
  is_crisis_resource_boolean?: boolean | string | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

const STATIC_FALLBACK_RESOURCES: ResourceListItem[] = [
  {
    resourceId: "res-grounding-54321",
    title: "5-4-3-2-1 Grounding Exercise",
    content:
      "A simple sensory grounding technique to help you stay present during moments of stress or anxiety.",
    primaryModeTag: "Mindfulness",
    subModeTag: "Anxiety",
    isFree: true,
    sensitivityFlag: "Low sensitivity",
  },
  {
    resourceId: "res-sleep-hygiene",
    title: "Sleep Hygiene Checklist",
    content:
      "Evidence-based habits to improve sleep quality — consistent schedule, wind-down routine, and environment tips.",
    primaryModeTag: "Wellness",
    subModeTag: "Sleep",
    isFree: true,
    sensitivityFlag: "Low sensitivity",
  },
  {
    resourceId: "res-boundary-scripts",
    title: "Healthy Boundary Scripts",
    content:
      "Conversation starters and phrases for setting boundaries with family, work, and relationships.",
    primaryModeTag: "Relationships",
    subModeTag: "Communication",
    isFree: false,
    sensitivityFlag: "Moderate sensitivity",
  },
];

function isSchemaUnavailable(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

function parseBoolean(value: unknown): boolean {
  if (value === true || value === "true" || value === "yes") return true;
  return false;
}

function toListItem(row: ResourceRow): ResourceListItem | null {
  if (!row.id) return null;
  const title = row.title_text?.trim();
  if (!title) return null;

  return {
    resourceId: row.id,
    title,
    content: row.content_text?.trim() ?? "",
    primaryModeTag: row.primary_mode_tag_text?.trim() || undefined,
    subModeTag: row.sub_mode_tag_text?.trim() || undefined,
    isFree: parseBoolean(row.is_free_boolean),
    sensitivityFlag: row.sensitivity_flag_text?.trim() || undefined,
    externalLink: row.external_link_text?.trim() || undefined,
    isCrisisResource: parseBoolean(row.is_crisis_resource_boolean),
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
      "id, title_text, content_text, primary_mode_tag_text, sub_mode_tag_text, is_free_boolean, sensitivity_flag_text, external_link_text, is_crisis_resource_boolean",
    )
    .eq("is_crisis_resource_boolean", false);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toListItem(row as ResourceRow))
    .filter((item): item is ResourceListItem => item !== null);
}

function deriveResources(
  onboardingData: Record<string, unknown> | null | undefined,
): ResourceListItem[] {
  const fromOnboarding = readOnboardingResources(onboardingData);
  if (fromOnboarding.length > 0) return fromOnboarding;
  return STATIC_FALLBACK_RESOURCES;
}

/**
 * Bubble ai_RNbBHYIu binding: Search custom.resource rows for paths library cards.
 * Tries resource then uds_resource; falls back to onboarding_data.resources then static seed.
 */
export async function fetchResources(
  onboardingData?: Record<string, unknown> | null,
): Promise<ResourceListItem[]> {
  const fromResource = await tryFetchFromTable("resource");
  if (fromResource !== null && fromResource.length > 0) return fromResource;

  const fromUds = await tryFetchFromTable("uds_resource");
  if (fromUds !== null && fromUds.length > 0) return fromUds;

  if (fromResource !== null || fromUds !== null) {
    return deriveResources(onboardingData);
  }

  return deriveResources(onboardingData);
}
