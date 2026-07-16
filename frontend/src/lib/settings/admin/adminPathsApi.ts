import { supabase } from "@/integrations/supabase/client";
import { slugifyPathName } from "@/lib/paths/pathsCatalogApi";
import {
  AI_COACHING_MODE,
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { getTierSubscriptionLabel } from "@/lib/enums/subscription";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export const ADMIN_PATHS_ONBOARDING_KEY = "admin_paths" as const;

export const SENSITIVITY_OPTIONS = [
  { value: "low", label: "Low sensitivity" },
  { value: "moderate", label: "Moderate sensitivity" },
  { value: "high", label: "High sensitivity" },
] as const;

export type SensitivitySlug = (typeof SENSITIVITY_OPTIONS)[number]["value"];

export interface AdminPathRecord {
  pathId: string;
  slug: string;
  name: string;
  description: string;
  tier: TierSlug;
  coachingMode: AiCoachingModeSlug;
  subMode: string;
  sensitivity: SensitivitySlug;
  sessionsCount: number;
}

export type AdminPathFormState = Omit<AdminPathRecord, "pathId" | "sessionsCount">;

type PathDbRow = {
  id?: string;
  name?: string;
  description?: string;
  tier?: string;
  aiCoachingMode?: string;
  subMode?: string;
  triggerSignals?: string | null;
  sessionsCount?: number | string | null;
};

/** Onboarding JSON fallback keeps slug/sensitivity outside the DB schema. */
type PathOnboardingRow = PathDbRow & {
  slug?: string;
  sensitivity_text?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

const PATH_SENSITIVITY_PREFIX = "sensitivity:";

function parseSensitivityFromTriggerSignals(value: string | undefined | null): SensitivitySlug {
  const match = value?.match(/sensitivity:(low|moderate|high)/);
  if (match && isSensitivitySlug(match[1])) return match[1];
  return "low";
}

function encodeSensitivityInTriggerSignals(
  sensitivity: SensitivitySlug,
  existing?: string | null,
): string {
  const without = (existing ?? "")
    .replace(/\bsensitivity:(?:low|moderate|high)\b/g, "")
    .trim();
  const token = `${PATH_SENSITIVITY_PREFIX}${sensitivity}`;
  return without ? `${without} ${token}` : token;
}

function isTierSlug(value: string | undefined): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

function isCoachingModeSlug(value: string | undefined): value is AiCoachingModeSlug {
  return Object.values(AI_COACHING_MODE).includes(value as AiCoachingModeSlug);
}

function isSensitivitySlug(value: string | undefined): value is SensitivitySlug {
  return SENSITIVITY_OPTIONS.some((option) => option.value === value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toAdminPath(row: PathOnboardingRow): AdminPathRecord | null {
  if (!row.id && !row.slug) return null;
  const name = row.name?.trim();
  if (!name) return null;

  const tier = isTierSlug(row.tier) ? row.tier : TIER.FREE;
  const coachingMode = isCoachingModeSlug(row.aiCoachingMode)
    ? row.aiCoachingMode
    : AI_COACHING_MODE.STABILIZER;
  const slug = row.slug?.trim() || slugifyPathName(name);
  const sensitivity = isSensitivitySlug(row.sensitivity_text)
    ? row.sensitivity_text
    : parseSensitivityFromTriggerSignals(row.triggerSignals);

  return {
    pathId: row.id ?? slug,
    slug,
    name,
    description: row.description?.trim() ?? "",
    tier,
    coachingMode,
    subMode: row.subMode?.trim() ?? "",
    sensitivity,
    sessionsCount: toNumber(row.sessionsCount),
  };
}

function pathDbRowFromForm(
  form: AdminPathFormState,
  pathId: string,
  existingTriggerSignals?: string | null,
): PathDbRow {
  const name = form.name.trim();
  return {
    id: pathId,
    name: name,
    description: form.description.trim(),
    tier: form.tier,
    aiCoachingMode: form.coachingMode,
    subMode: form.subMode.trim(),
    triggerSignals: encodeSensitivityInTriggerSignals(form.sensitivity, existingTriggerSignals),
  };
}

function pathOnboardingRowFromForm(
  form: AdminPathFormState,
  pathId: string,
  slug?: string,
): PathOnboardingRow {
  const name = form.name.trim();
  const resolvedSlug = slug?.trim() || slugifyPathName(name);
  return {
    ...pathDbRowFromForm(form, pathId),
    slug: resolvedSlug,
    sensitivity_text: form.sensitivity,
  };
}

async function readOnboardingPaths(userId: string): Promise<AdminPathRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};
  const raw = onboarding[ADMIN_PATHS_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => (entry && typeof entry === "object" ? toAdminPath(entry as PathOnboardingRow) : null))
    .filter((item): item is AdminPathRecord => item !== null);
}

async function writeOnboardingPaths(userId: string, paths: PathOnboardingRow[]): Promise<void> {
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
        [ADMIN_PATHS_ONBOARDING_KEY]: paths,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function tryFetchPathsFromTable(): Promise<AdminPathRecord[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("path")
    .select("id, name, description, tier, aiCoachingMode, subMode, triggerSignals, sessionsCount");

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminPath(row as PathDbRow))
    .filter((item): item is AdminPathRecord => item !== null);
}

export async function fetchAdminPaths(userId: string): Promise<AdminPathRecord[]> {
  const fromTable = await tryFetchPathsFromTable();
  if (fromTable !== null) return fromTable;

  return readOnboardingPaths(userId);
}

export function getPathTierLabel(tier: TierSlug): string {
  return getTierSubscriptionLabel(tier);
}

export function getPathModeLabel(mode: AiCoachingModeSlug): string {
  return AI_COACHING_MODE_LABELS[mode];
}

export function getSensitivityLabel(sensitivity: SensitivitySlug): string {
  return SENSITIVITY_OPTIONS.find((option) => option.value === sensitivity)?.label ?? sensitivity;
}

export async function createAdminPath(
  userId: string,
  form: AdminPathFormState,
): Promise<AdminPathRecord> {
  const name = form.name.trim();
  if (!name) throw new Error("Path title is required.");

  const pathId = crypto.randomUUID();
  const row = pathOnboardingRowFromForm(form, pathId);

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("path").insert(pathDbRowFromForm(form, pathId) as never);
  if (!tableError) {
    const created = toAdminPath(row);
    if (!created) throw new Error("Failed to create path.");
    return created;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingPaths(userId);
  const stored = existing.map((path) => pathOnboardingRowFromRecord(path));

  await writeOnboardingPaths(userId, [...stored, row]);
  const created = toAdminPath(row);
  if (!created) throw new Error("Failed to create path.");
  return created;
}

export async function deleteAdminPath(userId: string, pathId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("path").delete().eq("id", pathId);
  if (!tableError) return;
  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingPaths(userId);
  const next = existing
    .filter((path) => path.pathId !== pathId)
    .map((path) => pathOnboardingRowFromRecord(path));

  await writeOnboardingPaths(userId, next);
}

function pathOnboardingRowFromRecord(path: AdminPathRecord): PathOnboardingRow {
  return pathOnboardingRowFromForm(
    {
      slug: path.slug,
      name: path.name,
      description: path.description,
      tier: path.tier,
      coachingMode: path.coachingMode,
      subMode: path.subMode,
      sensitivity: path.sensitivity,
    },
    path.pathId,
    path.slug,
  );
}

export async function updateAdminPath(
  userId: string,
  pathId: string,
  form: AdminPathFormState,
): Promise<AdminPathRecord> {
  const name = form.name.trim();
  if (!name) throw new Error("Path title is required.");

  const client = supabase as unknown as UntypedSupabase;
  const { data: existingRow, error: readError } = await client
    .from("path")
    .select("triggerSignals")
    .eq("id", pathId)
    .maybeSingle();

  if (readError && !isSchemaUnavailable(readError)) throw readError;

  const row = pathOnboardingRowFromForm(form, pathId, form.slug.trim() || slugifyPathName(name));
  const dbRow = pathDbRowFromForm(
    form,
    pathId,
    (existingRow as PathDbRow | null)?.triggerSignals,
  );

  const { error: tableError } = await client.from("path").update(dbRow as never).eq("id", pathId);
  if (!tableError) {
    const updated = toAdminPath(row);
    if (!updated) throw new Error("Failed to update path.");
    return updated;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingPaths(userId);
  let found = false;
  const next = existing.map((path) => {
    if (path.pathId !== pathId) return pathOnboardingRowFromRecord(path);
    found = true;
    return row;
  });

  if (!found) throw new Error("Path not found.");
  await writeOnboardingPaths(userId, next);

  const updated = toAdminPath(row);
  if (!updated) throw new Error("Failed to update path.");
  return updated;
}

export function emptyAdminPathForm(): AdminPathFormState {
  return {
    slug: "",
    name: "",
    description: "",
    tier: TIER.FREE,
    coachingMode: AI_COACHING_MODE.STABILIZER,
    subMode: "",
    sensitivity: "low",
  };
}
