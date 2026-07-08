import { supabase } from "@/integrations/supabase/client";
import { ALL_PATHS } from "@/lib/paths";
import {
  AI_COACHING_MODE,
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { getTierSubscriptionLabel } from "@/lib/enums/subscription";

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
  isStatic?: boolean;
}

export type AdminPathFormState = Omit<AdminPathRecord, "pathId" | "isStatic">;

type PathRow = {
  id?: string;
  slug?: string;
  name_text?: string;
  description_text?: string;
  tier_option_tier_os?: string;
  ai_coaching_mode_option_ai_coaching_mode_os?: string;
  sub_mode_text?: string;
  sensitivity_text?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

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

function isTierSlug(value: string | undefined): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

function isCoachingModeSlug(value: string | undefined): value is AiCoachingModeSlug {
  return Object.values(AI_COACHING_MODE).includes(value as AiCoachingModeSlug);
}

function isSensitivitySlug(value: string | undefined): value is SensitivitySlug {
  return SENSITIVITY_OPTIONS.some((option) => option.value === value);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toAdminPath(row: PathRow, isStatic = false): AdminPathRecord | null {
  if (!row.id && !row.slug) return null;
  const name = row.name_text?.trim();
  if (!name) return null;

  const tier = isTierSlug(row.tier_option_tier_os) ? row.tier_option_tier_os : TIER.FREE;
  const coachingMode = isCoachingModeSlug(row.ai_coaching_mode_option_ai_coaching_mode_os)
    ? row.ai_coaching_mode_option_ai_coaching_mode_os
    : AI_COACHING_MODE.STABILIZER;

  return {
    pathId: row.id ?? row.slug ?? slugify(name),
    slug: row.slug ?? slugify(name),
    name,
    description: row.description_text?.trim() ?? "",
    tier,
    coachingMode,
    subMode: row.sub_mode_text?.trim() ?? "",
    sensitivity: isSensitivitySlug(row.sensitivity_text) ? row.sensitivity_text : "low",
    isStatic,
  };
}

function staticPaths(): AdminPathRecord[] {
  return ALL_PATHS.map((path) => ({
    pathId: path.slug,
    slug: path.slug,
    name: path.title,
    description: path.description,
    tier: path.tier,
    coachingMode: AI_COACHING_MODE.STABILIZER,
    subMode: path.subMode ?? "",
    sensitivity: "low" as const,
    isStatic: true,
  }));
}

async function readOnboardingPaths(userId: string): Promise<AdminPathRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};
  const raw = onboarding[ADMIN_PATHS_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => (entry && typeof entry === "object" ? toAdminPath(entry as PathRow) : null))
    .filter((item): item is AdminPathRecord => item !== null);
}

async function writeOnboardingPaths(userId: string, paths: PathRow[]): Promise<void> {
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
    .select(
      "id, slug, name_text, description_text, tier_option_tier_os, ai_coaching_mode_option_ai_coaching_mode_os, sub_mode_text, sensitivity_text",
    );

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminPath(row as PathRow))
    .filter((item): item is AdminPathRecord => item !== null);
}

export async function fetchAdminPaths(userId: string): Promise<AdminPathRecord[]> {
  const fromTable = await tryFetchPathsFromTable();
  if (fromTable !== null && fromTable.length > 0) return fromTable;

  const custom = await readOnboardingPaths(userId);
  if (custom.length > 0) return [...staticPaths(), ...custom];
  return staticPaths();
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

  const slug = slugify(name);
  const row: PathRow = {
    id: `path-${Date.now()}`,
    slug,
    name_text: name,
    description_text: form.description.trim(),
    tier_option_tier_os: form.tier,
    ai_coaching_mode_option_ai_coaching_mode_os: form.coachingMode,
    sub_mode_text: form.subMode.trim(),
    sensitivity_text: form.sensitivity,
  };

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("path").insert(row as never);
  if (!tableError) {
    const created = toAdminPath(row);
    if (!created) throw new Error("Failed to create path.");
    return created;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingPaths(userId);
  const stored = existing.map((path) => ({
    id: path.pathId,
    slug: path.slug,
    name_text: path.name,
    description_text: path.description,
    tier_option_tier_os: path.tier,
    ai_coaching_mode_option_ai_coaching_mode_os: path.coachingMode,
    sub_mode_text: path.subMode,
    sensitivity_text: path.sensitivity,
  }));

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
    .map((path) => ({
      id: path.pathId,
      slug: path.slug,
      name_text: path.name,
      description_text: path.description,
      tier_option_tier_os: path.tier,
      ai_coaching_mode_option_ai_coaching_mode_os: path.coachingMode,
      sub_mode_text: path.subMode,
      sensitivity_text: path.sensitivity,
    }));

  await writeOnboardingPaths(userId, next);
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
