import { supabase } from "@/integrations/supabase/client";

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
  name_text?: string;
  contact_email_text?: string;
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

function toAdminWorkplace(row: WorkplaceRow): AdminWorkplaceRecord | null {
  const name = row.name_text?.trim();
  const contactEmail = row.contact_email_text?.trim();
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
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};
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
        [ADMIN_WORKPLACES_ONBOARDING_KEY]: rows,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function tryFetchWorkplacesFromTable(): Promise<AdminWorkplaceRecord[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client.from("workplace").select("id, name_text, contact_email_text");

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminWorkplace(row as WorkplaceRow))
    .filter((item): item is AdminWorkplaceRecord => item !== null);
}

export async function fetchAdminWorkplaces(userId: string): Promise<AdminWorkplaceRecord[]> {
  const fromTable = await tryFetchWorkplacesFromTable();
  if (fromTable !== null) return fromTable;
  return readOnboardingWorkplaces(userId);
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
    name_text: form.name.trim(),
    contact_email_text: form.contactEmail.trim(),
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
    name_text: workplace.name,
    contact_email_text: workplace.contactEmail,
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
      name_text: workplace.name,
      contact_email_text: workplace.contactEmail,
    }));

  await writeOnboardingWorkplaces(userId, next);
}

export function emptyAdminWorkplaceForm(): AdminWorkplaceFormState {
  return { name: "", contactEmail: "" };
}
