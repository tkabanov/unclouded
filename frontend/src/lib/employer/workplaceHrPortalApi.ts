import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import { isValidUuid } from "@/lib/uuid/isValidUuid";
import {
  filterWorkplacesForHrContact,
  type WorkplaceRecord,
} from "../../../../supabase/functions/_shared/workplaceHrAuth.ts";

export type HrWorkplace = WorkplaceRecord;

export { isWorkplaceHrContact, normalizeEmail } from "../../../../supabase/functions/_shared/workplaceHrAuth.ts";

export async function listHrWorkplaces(userEmail: string | null | undefined): Promise<HrWorkplace[]> {
  if (!userEmail?.trim()) return [];

  const { data, error } = await supabase.from("workplace").select("id, name, contactEmail");

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  const workplaces = (data ?? [])
    .map((row) => {
      const record = row as { id?: string; name?: string; contactEmail?: string };
      if (!record.id || !record.name || !record.contactEmail) return null;
      if (!isValidUuid(record.id)) return null;
      return {
        id: record.id,
        name: record.name,
        contactEmail: record.contactEmail,
      } satisfies HrWorkplace;
    })
    .filter((workplace): workplace is HrWorkplace => workplace !== null);

  return filterWorkplacesForHrContact(workplaces, userEmail);
}
