import { supabase } from "@/integrations/supabase/client";
import {
  AI_COACHING_MODE,
  AI_COACHING_MODE_ORDER,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import {
  SENSITIVITY_OPTIONS,
  type SensitivitySlug,
} from "@/lib/settings/admin/adminPathsApi";
import { isSchemaUnavailable, parseBoolean } from "@/lib/supabase/schemaFallback";

export const ADMIN_RESOURCES_ONBOARDING_KEY = "admin_resources" as const;

export interface AdminResourceRecord {
  resourceId: string;
  title: string;
  content: string;
  primaryMode: AiCoachingModeSlug;
  subMode: string;
  sensitivity: SensitivitySlug;
  isFree: boolean;
  isCrisis: boolean;
  externalLink?: string;
}

export type AdminResourceFormState = Omit<AdminResourceRecord, "resourceId">;

type ResourceRow = {
  id?: string;
  title?: string;
  content?: string;
  primaryModeTag?: string;
  subModeTag?: string;
  sensitivityFlag?: string;
  isFree?: boolean | string | null;
  isCrisisResource?: boolean | string | null;
  externalLink?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type AdminResourcesLoadResult = {
  resources: AdminResourceRecord[];
  dataSource: AdminDataSource;
};

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
  const title = row.title?.trim();
  if (!title) return null;

  const primaryRaw = row.primaryModeTag?.trim().toLowerCase();
  const primaryMode = isCoachingModeSlug(primaryRaw)
    ? primaryRaw
    : AI_COACHING_MODE.STABILIZER;

  return {
    resourceId: row.id,
    title,
    content: row.content?.trim() ?? "",
    primaryMode,
    subMode: row.subModeTag?.trim() ?? "",
    sensitivity: isSensitivityFromLabel(row.sensitivityFlag),
    isFree: parseBoolean(row.isFree),
    isCrisis: parseBoolean(row.isCrisisResource),
    externalLink: row.externalLink?.trim() || undefined,
  };
}

async function readOnboardingResources(userId: string): Promise<AdminResourceRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};
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
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
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
      "id, title, content, primaryModeTag, subModeTag, sensitivityFlag, isFree, isCrisisResource, externalLink",
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

export async function fetchAdminResources(userId: string): Promise<AdminResourcesLoadResult> {
  const fromTable = await tryFetchResourcesFromTable();
  if (fromTable !== null) {
    return { resources: fromTable, dataSource: "table" };
  }

  const custom = await readOnboardingResources(userId);
  if (custom.length > 0) {
    return { resources: custom, dataSource: "onboarding" };
  }

  return { resources: [], dataSource: "table" };
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
    id: crypto.randomUUID(),
    title: title,
    content: form.content.trim(),
    primaryModeTag: form.primaryMode,
    subModeTag: form.subMode.trim(),
    sensitivityFlag: sensitivityLabel,
    isFree: form.isFree,
    isCrisisResource: form.isCrisis,
    externalLink: form.externalLink?.trim() || undefined,
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
    title: resource.title,
    content: resource.content,
    primaryModeTag: resource.primaryMode,
    subModeTag: resource.subMode,
    sensitivityFlag:
      SENSITIVITY_OPTIONS.find((option) => option.value === resource.sensitivity)?.label ??
      "Low sensitivity",
    isFree: resource.isFree,
    isCrisisResource: resource.isCrisis,
    externalLink: resource.externalLink,
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
      title: resource.title,
      content: resource.content,
      primaryModeTag: resource.primaryMode,
      subModeTag: resource.subMode,
      sensitivityFlag:
        SENSITIVITY_OPTIONS.find((option) => option.value === resource.sensitivity)?.label ??
        "Low sensitivity",
      isFree: resource.isFree,
      isCrisisResource: resource.isCrisis,
      externalLink: resource.externalLink,
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
    title: title,
    content: form.content.trim(),
    primaryModeTag: form.primaryMode,
    subModeTag: form.subMode.trim(),
    sensitivityFlag: sensitivityLabel,
    isFree: form.isFree,
    isCrisisResource: form.isCrisis,
    externalLink: form.externalLink?.trim() || undefined,
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
      isCrisis: resource.isCrisis,
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
    isCrisis: false,
    externalLink: "",
  };
}
