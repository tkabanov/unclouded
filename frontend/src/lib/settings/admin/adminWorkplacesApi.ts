import { supabase } from "@/integrations/supabase/client";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import { isValidUuid } from "@/lib/uuid/isValidUuid";

export const ADMIN_WORKPLACES_ONBOARDING_KEY = "admin_workplaces" as const;

export { isValidUuid };

export type ContractTier = "pro" | "premium";

export type BillingPeriod = "monthly" | "quarterly" | "half_yearly" | "yearly";

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
};

const WORKPLACE_SELECT =
  "id, name, contactEmail, contractTier, seatCount, contractStartDate, contractEndDate, isActive, billingPeriod, price";

export interface AdminWorkplaceRecord {
  workplaceId: string;
  name: string;
  contactEmail: string;
  contractTier: ContractTier;
  seatCount: number;
  contractStartDate: string | null;
  contractEndDate: string | null;
  isActive: boolean;
  billingPeriod: BillingPeriod | null;
  price: number | null;
  activeSeats?: number;
  /** False for legacy onboarding-only rows with non-UUID ids — metrics need the DB table. */
  metricsReady: boolean;
}

export type AdminWorkplaceFormState = {
  name: string;
  contactEmail: string;
  contractTier: ContractTier;
  seatCount: number;
  contractStartDate: string;
  contractEndDate: string;
  isActive: boolean;
  billingPeriod: BillingPeriod | "";
  price: string;
};

type WorkplaceRow = {
  id?: string;
  name?: string;
  contactEmail?: string;
  contractTier?: string;
  seatCount?: number;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  isActive?: boolean;
  billingPeriod?: string | null;
  price?: number | string | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type AdminWorkplacesLoadResult = {
  workplaces: AdminWorkplaceRecord[];
  dataSource: AdminDataSource;
};

function normalizeContractTier(value: string | null | undefined): ContractTier {
  return value?.trim().toLowerCase() === "premium" ? "premium" : "pro";
}

function normalizeBillingPeriod(value: string | null | undefined): BillingPeriod | null {
  const v = value?.trim().toLowerCase();
  if (v === "monthly" || v === "quarterly" || v === "half_yearly" || v === "yearly") {
    return v;
  }
  return null;
}

function normalizePrice(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function toAdminWorkplace(row: WorkplaceRow, metricsReady: boolean): AdminWorkplaceRecord | null {
  const name = row.name?.trim();
  const contactEmail = row.contactEmail?.trim();
  const workplaceId = row.id?.trim();
  if (!name || !contactEmail || !workplaceId) return null;

  return {
    workplaceId,
    name,
    contactEmail,
    contractTier: normalizeContractTier(row.contractTier),
    seatCount: typeof row.seatCount === "number" && row.seatCount > 0 ? row.seatCount : 50,
    contractStartDate: row.contractStartDate ?? null,
    contractEndDate: row.contractEndDate ?? null,
    isActive: row.isActive !== false,
    billingPeriod: normalizeBillingPeriod(row.billingPeriod),
    price: normalizePrice(row.price),
    metricsReady: metricsReady && isValidUuid(workplaceId),
  };
}

async function readOnboardingWorkplaces(userId: string): Promise<AdminWorkplaceRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};
  const raw = onboarding[ADMIN_WORKPLACES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) =>
      entry && typeof entry === "object"
        ? toAdminWorkplace(entry as WorkplaceRow, false)
        : null,
    )
    .filter((item): item is AdminWorkplaceRecord => item !== null);
}

async function writeOnboardingWorkplaces(userId: string, rows: WorkplaceRow[]): Promise<void> {
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
        [ADMIN_WORKPLACES_ONBOARDING_KEY]: rows,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function attachActiveSeats(
  workplaces: AdminWorkplaceRecord[],
): Promise<AdminWorkplaceRecord[]> {
  return Promise.all(
    workplaces.map(async (workplace) => {
      if (!workplace.metricsReady) return workplace;
      try {
        const activeSeats = await fetchAdminWorkplaceActiveSeats(workplace.workplaceId);
        return { ...workplace, activeSeats };
      } catch {
        return workplace;
      }
    }),
  );
}

async function tryFetchWorkplacesFromTable(): Promise<AdminWorkplaceRecord[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client.from("workplace").select(WORKPLACE_SELECT);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminWorkplace(row as WorkplaceRow, true))
    .filter((item): item is AdminWorkplaceRecord => item !== null);
}

export async function fetchAdminWorkplaces(userId: string): Promise<AdminWorkplacesLoadResult> {
  const fromTable = await tryFetchWorkplacesFromTable();
  if (fromTable !== null) {
    return {
      workplaces: await attachActiveSeats(fromTable),
      dataSource: "table",
    };
  }

  const workplaces = await readOnboardingWorkplaces(userId);
  return {
    workplaces,
    dataSource: workplaces.length > 0 ? "onboarding" : "static",
  };
}

export async function fetchAdminWorkplace(
  userId: string,
  workplaceId: string,
): Promise<AdminWorkplaceRecord | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("workplace")
    .select(WORKPLACE_SELECT)
    .eq("id", workplaceId)
    .maybeSingle();

  if (!error && data) {
    const workplace = toAdminWorkplace(data as WorkplaceRow, true);
    if (!workplace) return null;
    const [withSeats] = await attachActiveSeats([workplace]);
    return withSeats;
  }

  if (error && !isSchemaUnavailable(error)) throw error;

  const fromOnboarding = await readOnboardingWorkplaces(userId);
  return fromOnboarding.find((w) => w.workplaceId === workplaceId) ?? null;
}

function parseFormPrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    throw new Error("Enter a valid price.");
  }
  if (n < 0) {
    throw new Error("Price cannot be negative.");
  }
  return n;
}

function validateWorkplaceForm(form: AdminWorkplaceFormState): void {
  if (!form.name.trim()) throw new Error("Organization name is required.");
  if (!form.contactEmail.trim()) throw new Error("HR contact email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
    throw new Error("Enter a valid HR contact email.");
  }
  if (!Number.isFinite(form.seatCount) || form.seatCount <= 0) {
    throw new Error("Seat count must be at least 1.");
  }
  parseFormPrice(form.price);
}

function normalizeOptionalDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function workplaceInsertPayload(form: AdminWorkplaceFormState): Record<string, unknown> {
  return {
    name: form.name.trim(),
    contactEmail: form.contactEmail.trim(),
    contractTier: form.contractTier,
    seatCount: form.seatCount,
    contractStartDate: normalizeOptionalDate(form.contractStartDate),
    contractEndDate: normalizeOptionalDate(form.contractEndDate),
    isActive: form.isActive,
    billingPeriod: form.billingPeriod || null,
    price: parseFormPrice(form.price),
  };
}

export async function createAdminWorkplace(
  userId: string,
  form: AdminWorkplaceFormState,
): Promise<AdminWorkplaceRecord> {
  validateWorkplaceForm(form);

  const client = supabase as unknown as UntypedSupabase;
  const { data: inserted, error: tableError } = await client
    .from("workplace")
    .insert(workplaceInsertPayload(form) as never)
    .select(WORKPLACE_SELECT)
    .maybeSingle();

  if (!tableError && inserted) {
    const created = toAdminWorkplace(inserted as WorkplaceRow, true);
    if (!created) throw new Error("Failed to create organization.");
    return created;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const row: WorkplaceRow = {
    id: crypto.randomUUID(),
    name: form.name.trim(),
    contactEmail: form.contactEmail.trim(),
    contractTier: form.contractTier,
    seatCount: form.seatCount,
    contractStartDate: normalizeOptionalDate(form.contractStartDate),
    contractEndDate: normalizeOptionalDate(form.contractEndDate),
    isActive: form.isActive,
    billingPeriod: form.billingPeriod || null,
    price: parseFormPrice(form.price),
  };

  const existing = await readOnboardingWorkplaces(userId);
  const stored = existing.map((workplace) => workplaceRowFromRecord(workplace));

  await writeOnboardingWorkplaces(userId, [...stored, row]);
  const created = toAdminWorkplace(row, false);
  if (!created) throw new Error("Failed to create organization.");
  return created;
}

export async function deleteAdminWorkplace(userId: string, workplaceId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("workplace").delete().eq("id", workplaceId);
  if (!tableError) return;
  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingWorkplaces(userId);
  const next = existing
    .filter((workplace) => workplace.workplaceId !== workplaceId)
    .map((workplace) => workplaceRowFromRecord(workplace));

  await writeOnboardingWorkplaces(userId, next);
}

function workplaceRowFromForm(form: AdminWorkplaceFormState, workplaceId: string): WorkplaceRow {
  return {
    id: workplaceId,
    name: form.name.trim(),
    contactEmail: form.contactEmail.trim(),
    contractTier: form.contractTier,
    seatCount: form.seatCount,
    contractStartDate: normalizeOptionalDate(form.contractStartDate),
    contractEndDate: normalizeOptionalDate(form.contractEndDate),
    isActive: form.isActive,
    billingPeriod: form.billingPeriod || null,
    price: parseFormPrice(form.price),
  };
}

function workplaceRowFromRecord(workplace: AdminWorkplaceRecord): WorkplaceRow {
  return {
    id: workplace.workplaceId,
    name: workplace.name,
    contactEmail: workplace.contactEmail,
    contractTier: workplace.contractTier,
    seatCount: workplace.seatCount,
    contractStartDate: workplace.contractStartDate,
    contractEndDate: workplace.contractEndDate,
    isActive: workplace.isActive,
    billingPeriod: workplace.billingPeriod,
    price: workplace.price,
  };
}

export async function updateAdminWorkplace(
  userId: string,
  workplaceId: string,
  form: AdminWorkplaceFormState,
): Promise<AdminWorkplaceRecord> {
  validateWorkplaceForm(form);

  const row = workplaceRowFromForm(form, workplaceId);

  const client = supabase as unknown as UntypedSupabase;
  const { data: updatedRow, error: tableError } = await client
    .from("workplace")
    .update(workplaceInsertPayload(form) as never)
    .eq("id", workplaceId)
    .select(WORKPLACE_SELECT)
    .maybeSingle();

  if (!tableError && updatedRow) {
    const updated = toAdminWorkplace(updatedRow as WorkplaceRow, true);
    if (!updated) throw new Error("Failed to update organization.");
    return updated;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingWorkplaces(userId);
  let found = false;
  const next = existing.map((workplace) => {
    if (workplace.workplaceId !== workplaceId) return workplaceRowFromRecord(workplace);
    found = true;
    return row;
  });

  if (!found) throw new Error("Organization not found.");
  await writeOnboardingWorkplaces(userId, next);

  const updated = toAdminWorkplace(row, false);
  if (!updated) throw new Error("Failed to update organization.");
  return updated;
}

export function adminWorkplaceToForm(workplace: AdminWorkplaceRecord): AdminWorkplaceFormState {
  return {
    name: workplace.name,
    contactEmail: workplace.contactEmail,
    contractTier: workplace.contractTier,
    seatCount: workplace.seatCount,
    contractStartDate: workplace.contractStartDate ?? "",
    contractEndDate: workplace.contractEndDate ?? "",
    isActive: workplace.isActive,
    billingPeriod: workplace.billingPeriod ?? "",
    price: workplace.price === null || workplace.price === undefined ? "" : String(workplace.price),
  };
}

export async function fetchAdminWorkplaceActiveSeats(workplaceId: string): Promise<number> {
  const { data, error } = await supabase.rpc("count_workplace_active_seats", {
    p_workplace_id: workplaceId,
  });
  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}

export function emptyAdminWorkplaceForm(): AdminWorkplaceFormState {
  return {
    name: "",
    contactEmail: "",
    contractTier: "pro",
    seatCount: 50,
    contractStartDate: "",
    contractEndDate: "",
    isActive: true,
    billingPeriod: "",
    price: "",
  };
}

export function formatBillingPeriod(value: BillingPeriod | null | undefined): string {
  if (!value) return "—";
  return BILLING_PERIOD_LABELS[value] ?? value;
}

export function formatWorkplacePrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatSeatUtilization(
  activeSeats: number | undefined,
  seatCount: number,
): string {
  const active = typeof activeSeats === "number" ? activeSeats : "—";
  return `${active} / ${seatCount}`;
}
