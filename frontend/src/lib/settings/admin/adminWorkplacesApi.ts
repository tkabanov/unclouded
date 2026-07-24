import { supabase } from "@/integrations/supabase/client";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import { isValidUuid } from "@/lib/uuid/isValidUuid";

export const ADMIN_WORKPLACES_ONBOARDING_KEY = "admin_workplaces" as const;

export { isValidUuid };

export type ContractTier = "pro" | "premium";

export interface AdminWorkplaceRecord {
  workplaceId: string;
  name: string;
  contactEmail: string;
  contractTier: ContractTier;
  seatCount: number;
  contractStartDate: string | null;
  contractEndDate: string | null;
  isActive: boolean;
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

async function tryFetchWorkplacesFromTable(): Promise<AdminWorkplaceRecord[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client.from("workplace").select(
    'id, name, contactEmail, contractTier, seatCount, contractStartDate, contractEndDate, isActive',
  );

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
      workplaces: fromTable,
      dataSource: "table",
    };
  }

  const workplaces = await readOnboardingWorkplaces(userId);
  return {
    workplaces,
    dataSource: workplaces.length > 0 ? "onboarding" : "static",
  };
}

function validateWorkplaceForm(form: AdminWorkplaceFormState): void {
  if (!form.name.trim()) throw new Error("Workplace name is required.");
  if (!form.contactEmail.trim()) throw new Error("Contact email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
    throw new Error("Enter a valid contact email.");
  }
  if (!Number.isFinite(form.seatCount) || form.seatCount <= 0) {
    throw new Error("Seat count must be at least 1.");
  }
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
    .select('id, name, contactEmail, contractTier, seatCount, contractStartDate, contractEndDate, isActive')
    .maybeSingle();

  if (!tableError && inserted) {
    const created = toAdminWorkplace(inserted as WorkplaceRow, true);
    if (!created) throw new Error("Failed to create workplace.");
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
  };

  const existing = await readOnboardingWorkplaces(userId);
  const stored = existing.map((workplace) => ({
    id: workplace.workplaceId,
    name: workplace.name,
    contactEmail: workplace.contactEmail,
  }));

  await writeOnboardingWorkplaces(userId, [...stored, row]);
  const created = toAdminWorkplace(row, false);
  if (!created) throw new Error("Failed to create workplace.");
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
    .map((workplace) => ({
      id: workplace.workplaceId,
      name: workplace.name,
      contactEmail: workplace.contactEmail,
    }));

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
    .select('id, name, contactEmail, contractTier, seatCount, contractStartDate, contractEndDate, isActive')
    .maybeSingle();

  if (!tableError && updatedRow) {
    const updated = toAdminWorkplace(updatedRow as WorkplaceRow, true);
    if (!updated) throw new Error("Failed to update workplace.");
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

  if (!found) throw new Error("Workplace not found.");
  await writeOnboardingWorkplaces(userId, next);

  const updated = toAdminWorkplace(row, false);
  if (!updated) throw new Error("Failed to update workplace.");
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
  };
}
