import { supabase } from "@/integrations/supabase/client";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export const ADMIN_WORKPLACES_ONBOARDING_KEY = "admin_workplaces" as const;

export interface AdminWorkplaceRecord {
  workplaceId: string;
  name: string;
  contactEmail: string;
}

export type AdminWorkplaceFormState = {
  name: string;
  contactEmail: string;
};

type WorkplaceRow = {
  id?: string;
  name?: string;
  contactEmail?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type AdminWorkplacesLoadResult = {
  workplaces: AdminWorkplaceRecord[];
  dataSource: AdminDataSource;
};

function toAdminWorkplace(row: WorkplaceRow): AdminWorkplaceRecord | null {
  const name = row.name?.trim();
  const contactEmail = row.contactEmail?.trim();
  if (!name || !contactEmail) return null;

  return {
    workplaceId: row.id ?? `workplace-${Date.now()}`,
    name,
    contactEmail,
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
      entry && typeof entry === "object" ? toAdminWorkplace(entry as WorkplaceRow) : null,
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
  const { data, error } = await client.from("workplace").select("id, name, contactEmail");

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminWorkplace(row as WorkplaceRow))
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
}

export async function createAdminWorkplace(
  userId: string,
  form: AdminWorkplaceFormState,
): Promise<AdminWorkplaceRecord> {
  validateWorkplaceForm(form);

  const row: WorkplaceRow = {
    id: `workplace-${Date.now()}`,
    name: form.name.trim(),
    contactEmail: form.contactEmail.trim(),
  };

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("workplace").insert(row as never);
  if (!tableError) {
    const created = toAdminWorkplace(row);
    if (!created) throw new Error("Failed to create workplace.");
    return created;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingWorkplaces(userId);
  const stored = existing.map((workplace) => ({
    id: workplace.workplaceId,
    name: workplace.name,
    contactEmail: workplace.contactEmail,
  }));

  await writeOnboardingWorkplaces(userId, [...stored, row]);
  const created = toAdminWorkplace(row);
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
  };
}

function workplaceRowFromRecord(workplace: AdminWorkplaceRecord): WorkplaceRow {
  return workplaceRowFromForm(
    { name: workplace.name, contactEmail: workplace.contactEmail },
    workplace.workplaceId,
  );
}

export async function updateAdminWorkplace(
  userId: string,
  workplaceId: string,
  form: AdminWorkplaceFormState,
): Promise<AdminWorkplaceRecord> {
  validateWorkplaceForm(form);

  const row = workplaceRowFromForm(form, workplaceId);

  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("workplace").update(row as never).eq("id", workplaceId);
  if (!tableError) {
    const updated = toAdminWorkplace(row);
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

  const updated = toAdminWorkplace(row);
  if (!updated) throw new Error("Failed to update workplace.");
  return updated;
}

export function emptyAdminWorkplaceForm(): AdminWorkplaceFormState {
  return { name: "", contactEmail: "" };
}
