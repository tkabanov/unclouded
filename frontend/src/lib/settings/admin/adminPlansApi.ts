import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanId } from "@/lib/plans";
import { getTierSubscriptionLabel } from "@/lib/enums/subscription";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export const ADMIN_PLANS_ONBOARDING_KEY = "admin_plans" as const;

const SEEDED_PLAN_IDS = new Set<PlanId>(["free", "pro", "premium"]);

export interface AdminPlanRecord {
  planId: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  isStatic?: boolean;
}

export type AdminPlanFormState = {
  name: string;
  price: number;
  description: string;
  features: string;
};

type PlanRow = {
  id?: string;
  name?: string;
  price?: number | string | null;
  description?: string;
  features?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type AdminPlansLoadResult = {
  plans: AdminPlanRecord[];
  dataSource: AdminDataSource;
};

function toAdminPlan(row: PlanRow, isStatic = false): AdminPlanRecord | null {
  const name = row.name?.trim();
  if (!name) return null;
  const priceRaw = row.price;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string" && priceRaw.trim()
        ? Number(priceRaw)
        : 0;

  const features =
    typeof row.features === "string"
      ? row.features.split("\n").map((line) => line.trim()).filter(Boolean)
      : [];

  const planId = row.id ?? name.toLowerCase().replace(/\s+/g, "-");

  return {
    planId,
    name,
    price: Number.isFinite(price) ? price : 0,
    description: row.description?.trim() ?? "",
    features,
    isStatic: isStatic || SEEDED_PLAN_IDS.has(planId as PlanId),
  };
}

function staticPlans(): AdminPlanRecord[] {
  return PLANS.map((plan) => ({
    planId: plan.id,
    name: plan.name,
    price: plan.id === "pro" ? 29 : plan.id === "premium" ? 0 : 0,
    description: plan.tagline,
    features: plan.features,
    isStatic: true,
  }));
}

async function readOnboardingPlans(userId: string): Promise<AdminPlanRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};
  const raw = onboarding[ADMIN_PLANS_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => (entry && typeof entry === "object" ? toAdminPlan(entry as PlanRow) : null))
    .filter((item): item is AdminPlanRecord => item !== null);
}

async function writeOnboardingPlans(userId: string, rows: PlanRow[]): Promise<void> {
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
        [ADMIN_PLANS_ONBOARDING_KEY]: rows,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function tryFetchPlansFromTable(): Promise<AdminPlanRecord[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("subscriptionPlan")
    .select("id, name, price, description, features");

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminPlan(row as PlanRow))
    .filter((item): item is AdminPlanRecord => item !== null);
}

export async function fetchAdminPlans(userId: string): Promise<AdminPlansLoadResult> {
  const fromTable = await tryFetchPlansFromTable();
  if (fromTable !== null && fromTable.length > 0) {
    return { plans: fromTable, dataSource: "table" };
  }

  const custom = await readOnboardingPlans(userId);
  if (custom.length > 0) {
    return { plans: [...staticPlans(), ...custom], dataSource: "onboarding" };
  }

  return { plans: staticPlans(), dataSource: "static" };
}

export function formatPlanPrice(plan: AdminPlanRecord): string {
  if (plan.price <= 0 && plan.planId === ("premium" as PlanId)) return "Custom";
  if (plan.price <= 0) return "$0";
  return `$${plan.price}`;
}

export function getPlanTierLabel(planId: string): string {
  if (planId === "free" || planId === "pro" || planId === "premium") {
    return getTierSubscriptionLabel(planId);
  }
  return planId;
}

export async function createAdminPlan(
  userId: string,
  form: AdminPlanFormState,
): Promise<AdminPlanRecord> {
  const name = form.name.trim();
  if (!name) throw new Error("Plan name is required.");

  const row: PlanRow = {
    id: `plan-${Date.now()}`,
    name: name,
    price: form.price,
    description: form.description.trim(),
    features: form.features
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
  };

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("subscriptionPlan").insert(row as never);
  if (!tableError) {
    const created = toAdminPlan(row);
    if (!created) throw new Error("Failed to create plan.");
    return created;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingPlans(userId);
  const stored = existing.map((plan) => ({
    id: plan.planId,
    name: plan.name,
    price: plan.price,
    description: plan.description,
    features: plan.features.join("\n"),
  }));

  await writeOnboardingPlans(userId, [...stored, row]);
  const created = toAdminPlan(row);
  if (!created) throw new Error("Failed to create plan.");
  return created;
}

export async function deleteAdminPlan(userId: string, planId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("subscriptionPlan").delete().eq("id", planId);
  if (!tableError) return;
  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingPlans(userId);
  const next = existing
    .filter((plan) => plan.planId !== planId)
    .map((plan) => ({
      id: plan.planId,
      name: plan.name,
      price: plan.price,
      description: plan.description,
      features: plan.features.join("\n"),
    }));

  await writeOnboardingPlans(userId, next);
}

function planRowFromForm(form: AdminPlanFormState, planId: string): PlanRow {
  const name = form.name.trim();
  return {
    id: planId,
    name: name,
    price: form.price,
    description: form.description.trim(),
    features: form.features
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
  };
}

function planRowFromRecord(plan: AdminPlanRecord): PlanRow {
  return planRowFromForm(
    {
      name: plan.name,
      price: plan.price,
      description: plan.description,
      features: plan.features.join("\n"),
    },
    plan.planId,
  );
}

export async function updateAdminPlan(
  userId: string,
  planId: string,
  form: AdminPlanFormState,
): Promise<AdminPlanRecord> {
  const name = form.name.trim();
  if (!name) throw new Error("Plan name is required.");

  const row = planRowFromForm(form, planId);

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("subscriptionPlan").update(row as never).eq("id", planId);
  if (!tableError) {
    const updated = toAdminPlan(row);
    if (!updated) throw new Error("Failed to update plan.");
    return updated;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingPlans(userId);
  let found = false;
  const next = existing.map((plan) => {
    if (plan.planId !== planId) return planRowFromRecord(plan);
    found = true;
    return row;
  });

  if (!found) throw new Error("Plan not found.");
  await writeOnboardingPlans(userId, next);

  const updated = toAdminPlan(row);
  if (!updated) throw new Error("Failed to update plan.");
  return updated;
}

export function emptyAdminPlanForm(): AdminPlanFormState {
  return {
    name: "",
    price: 0,
    description: "",
    features: "",
  };
}
