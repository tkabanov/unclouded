import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import { isValidUuid } from "@/lib/uuid/isValidUuid";
import {
  filterWorkplacesForHrContact,
  type WorkplaceRecord,
} from "../../../../supabase/functions/_shared/workplaceHrAuth.ts";

export type HrWorkplace = WorkplaceRecord;

export { isWorkplaceHrContact, normalizeEmail } from "../../../../supabase/functions/_shared/workplaceHrAuth.ts";

function mapWorkplaceRow(row: {
  id?: string;
  name?: string;
  contactEmail?: string;
}): HrWorkplace | null {
  if (!row.id || !row.name || !row.contactEmail) return null;
  if (!isValidUuid(row.id)) return null;
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contactEmail,
  };
}

export async function listHrWorkplaces(
  userEmail: string | null | undefined,
  userId: string | null | undefined,
): Promise<HrWorkplace[]> {
  const byId = new Map<string, HrWorkplace>();

  const { data: allWorkplaces, error: workplaceError } = await supabase
    .from("workplace")
    .select("id, name, contactEmail");

  if (workplaceError) {
    if (isSchemaUnavailable(workplaceError)) return [];
    throw workplaceError;
  }

  const workplaces = (allWorkplaces ?? [])
    .map((row) => mapWorkplaceRow(row as { id?: string; name?: string; contactEmail?: string }))
    .filter((workplace): workplace is HrWorkplace => workplace !== null);

  for (const workplace of filterWorkplacesForHrContact(workplaces, userEmail)) {
    byId.set(workplace.id, workplace);
  }

  if (userId) {
    const { data: delegateRows, error: delegateError } = await supabase
      .from("workplaceMemberRole")
      .select("workplaceId")
      .eq("userId", userId)
      .eq("role", "hr");

    if (delegateError) {
      if (!isSchemaUnavailable(delegateError)) throw delegateError;
    } else {
      for (const row of delegateRows ?? []) {
        const workplaceId = (row as { workplaceId?: string }).workplaceId;
        if (!workplaceId) continue;
        const workplace = workplaces.find((item) => item.id === workplaceId);
        if (workplace) byId.set(workplace.id, workplace);
      }
    }
  }

  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
}
