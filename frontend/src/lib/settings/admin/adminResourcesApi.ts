import { supabase } from "@/integrations/supabase/client";
import {
  AI_COACHING_MODE,
  AI_COACHING_MODE_ORDER,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import {
  SENSITIVITY_OPTIONS,
  type SensitivitySlug,
} from "@/lib/settings/admin/adminPathsApi";

export const ADMIN_RESOURCES_ONBOARDING_KEY = "admin_resources" as const;

export interface AdminResourceRecord {
  resourceId: string;
  title: string;
  content: string;
  primaryMode: AiCoachingModeSlug;
  subMode: string;
  sensitivity: SensitivitySlug;
  isFree: boolean;
  externalLink?: string;
}

export type AdminResourceFormState = Omit<AdminResourceRecord, "resourceId">;

type ResourceRow = {
  id?: string;
  title_text?: string;
  content_text?: string;
  primary_mode_tag_text?: string;
  sub_mode_tag_text?: string;
  sensitivity_flag_text?: string;
  is_free_boolean?: boolean | string | null;
  external_link_text?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

const STATIC_FALLBACK: AdminResourceRecord[] = [
  {
    resourceId: "res-grounding-54321",
    title: "5-4-3-2-1 Grounding Exercise",
    content:
      "A simple sensory grounding technique to help you stay present during moments of stress or anxiety.",
    primaryMode: AI_COACHING_MODE.STABILIZER,
    subMode: "Anxiety",
    sensitivity: "low",
    isFree: true,
  },
  {
    resourceId: "res-sleep-hygiene",
    title: "Sleep Hygiene Checklist",
    content:
      "Evidence-based habits to improve sleep quality — consistent schedule, wind-down routine, and environment tips.",
    primaryMode: AI_COACHING_MODE.SIMPLIFIER,
    subMode: "Sleep",
    sensitivity: "low",
    isFree: true,
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
  return value === true || value === "true" || value === "yes";
}

function isCoachingModeSlug(value: string | undefined): value is AiCoachingModeSlug {
  return AI_COACHING_MODE_ORDER.includes(value as AiCoachingModeSlug);
}

function isSensitivityFromLabel(value: string | undefined): SensitivitySlug {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("moderate")) return "moderate";
  return "low";
}

function toAdminResource(row: ResourceRow): AdminResourceRecord | null {
  if (!row.id) return null;
  const title = row.title_text?.trim();
  if (!title) return null;

  const primaryRaw = row.primary_mode_tag_text?.trim().toLowerCase();
  const primaryMode = isCoachingModeSlug(primaryRaw)
    ? primaryRaw
    : AI_COACHING_MODE.STABILIZER;

  return {
    resourceId: row.id,
    title,
    content: row.content_text?.trim() ?? "",
    primaryMode,
    subMode: row.sub_mode_tag_text?.trim() ?? "",
    sensitivity: isSensitivityFromLabel(row.sensitivity_flag_text),
    isFree: parseBoolean(row.is_free_boolean),
    externalLink: row.external_link_text?.trim() || undefined,
  };
}

async function readOnboardingResources(userId: string): Promise<AdminResourceRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};
  const raw = onboarding[ADMIN_RESOURCES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) =>
      entry && typeof entry === "object" ? toAdminResource(entry as ResourceRow) : null,
    )
    .filter((item): item is AdminResourceRecord => item !== null);
}

async function writeOnboardingResources(userId: string, rows: ResourceRow[]): Promise<void> {
  const { data, error: readError } = await supabase
    .from("profiles")
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_data: {
        ...onboarding,
        [ADMIN_RESOURCES_ONBOARDING_KEY]: rows,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function tryFetchResourcesFromTable(): Promise<AdminResourceRecord[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("resource")
    .select(
      "id, title_text, content_text, primary_mode_tag_text, sub_mode_tag_text, sensitivity_flag_text, is_free_boolean, external_link_text",
    );

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminResource(row as ResourceRow))
    .filter((item): item is AdminResourceRecord => item !== null);
}

export async function fetchAdminResources(userId: string): Promise<AdminResourceRecord[]> {
  const fromTable = await tryFetchResourcesFromTable();
  if (fromTable !== null && fromTable.length > 0) return fromTable;

  const custom = await readOnboardingResources(userId);
  if (custom.length > 0) return custom;
  return STATIC_FALLBACK;
}

export { SENSITIVITY_OPTIONS };

export async function createAdminResource(
  userId: string,
  form: AdminResourceFormState,
): Promise<AdminResourceRecord> {
  const title = form.title.trim();
  if (!title) throw new Error("Resource title is required.");

  const sensitivityLabel =
    SENSITIVITY_OPTIONS.find((option) => option.value === form.sensitivity)?.label ??
    "Low sensitivity";

  const row: ResourceRow = {
    id: `res-${Date.now()}`,
    title_text: title,
    content_text: form.content.trim(),
    primary_mode_tag_text: form.primaryMode,
    sub_mode_tag_text: form.subMode.trim(),
    sensitivity_flag_text: sensitivityLabel,
    is_free_boolean: form.isFree,
    external_link_text: form.externalLink?.trim() || undefined,
  };

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("resource").insert(row as never);
  if (!tableError) {
    const created = toAdminResource(row);
    if (!created) throw new Error("Failed to create resource.");
    return created;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingResources(userId);
  const stored = existing.map((resource) => ({
    id: resource.resourceId,
    title_text: resource.title,
    content_text: resource.content,
    primary_mode_tag_text: resource.primaryMode,
    sub_mode_tag_text: resource.subMode,
    sensitivity_flag_text:
      SENSITIVITY_OPTIONS.find((option) => option.value === resource.sensitivity)?.label ??
      "Low sensitivity",
    is_free_boolean: resource.isFree,
    external_link_text: resource.externalLink,
  }));

  await writeOnboardingResources(userId, [...stored, row]);
  const created = toAdminResource(row);
  if (!created) throw new Error("Failed to create resource.");
  return created;
}

export async function deleteAdminResource(userId: string, resourceId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("resource").delete().eq("id", resourceId);
  if (!tableError) return;
  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingResources(userId);
  const next = existing
    .filter((resource) => resource.resourceId !== resourceId)
    .map((resource) => ({
      id: resource.resourceId,
      title_text: resource.title,
      content_text: resource.content,
      primary_mode_tag_text: resource.primaryMode,
      sub_mode_tag_text: resource.subMode,
      sensitivity_flag_text:
        SENSITIVITY_OPTIONS.find((option) => option.value === resource.sensitivity)?.label ??
        "Low sensitivity",
      is_free_boolean: resource.isFree,
      external_link_text: resource.externalLink,
    }));

  await writeOnboardingResources(userId, next);
}

function resourceRowFromForm(form: AdminResourceFormState, resourceId: string): ResourceRow {
  const title = form.title.trim();
  const sensitivityLabel =
    SENSITIVITY_OPTIONS.find((option) => option.value === form.sensitivity)?.label ??
    "Low sensitivity";

  return {
    id: resourceId,
    title_text: title,
    content_text: form.content.trim(),
    primary_mode_tag_text: form.primaryMode,
    sub_mode_tag_text: form.subMode.trim(),
    sensitivity_flag_text: sensitivityLabel,
    is_free_boolean: form.isFree,
    external_link_text: form.externalLink?.trim() || undefined,
  };
}

function resourceRowFromRecord(resource: AdminResourceRecord): ResourceRow {
  return resourceRowFromForm(
    {
      title: resource.title,
      content: resource.content,
      primaryMode: resource.primaryMode,
      subMode: resource.subMode,
      sensitivity: resource.sensitivity,
      isFree: resource.isFree,
      externalLink: resource.externalLink ?? "",
    },
    resource.resourceId,
  );
}

export async function updateAdminResource(
  userId: string,
  resourceId: string,
  form: AdminResourceFormState,
): Promise<AdminResourceRecord> {
  const title = form.title.trim();
  if (!title) throw new Error("Resource title is required.");

  const row = resourceRowFromForm(form, resourceId);

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("resource").update(row as never).eq("id", resourceId);
  if (!tableError) {
    const updated = toAdminResource(row);
    if (!updated) throw new Error("Failed to update resource.");
    return updated;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingResources(userId);
  let found = false;
  const next = existing.map((resource) => {
    if (resource.resourceId !== resourceId) return resourceRowFromRecord(resource);
    found = true;
    return row;
  });

  if (!found) throw new Error("Resource not found.");
  await writeOnboardingResources(userId, next);

  const updated = toAdminResource(row);
  if (!updated) throw new Error("Failed to update resource.");
  return updated;
}

export function emptyAdminResourceForm(): AdminResourceFormState {
  return {
    title: "",
    content: "",
    primaryMode: AI_COACHING_MODE.STABILIZER,
    subMode: "",
    sensitivity: "low",
    isFree: true,
    externalLink: "",
  };
}
