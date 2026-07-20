import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export type ManagerDirectReportLink = {
  id: string;
  managerUserId: string;
  reportUserId: string;
  workplaceId: string;
  managerLabel: string;
  reportLabel: string;
};

export type WorkplaceMemberOption = {
  userId: string;
  label: string;
  managesATeam: boolean;
};

function memberLabel(row: {
  id?: string;
  email?: string | null;
  firstName?: string | null;
}): string {
  const name = row.firstName?.trim();
  const email = row.email?.trim();
  if (name && email) return `${name} (${email})`;
  return email ?? row.id ?? "Unknown";
}

export async function listWorkplaceMembers(workplaceId: string): Promise<WorkplaceMemberOption[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, firstName, managesATeam")
    .eq("workplaceId", workplaceId)
    .order("firstName", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const record = row as {
        id?: string;
        email?: string | null;
        firstName?: string | null;
        managesATeam?: boolean | null;
      };
      if (!record.id) return null;
      return {
        userId: record.id,
        label: memberLabel(record),
        managesATeam: record.managesATeam === true,
      };
    })
    .filter((member): member is WorkplaceMemberOption => member !== null);
}

export async function listManagerDirectReports(
  workplaceId: string,
): Promise<ManagerDirectReportLink[]> {
  const { data, error } = await supabase
    .from("managerDirectReport")
    .select("id, managerUserId, reportUserId, workplaceId")
    .eq("workplaceId", workplaceId);

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  const links = data ?? [];
  if (links.length === 0) return [];

  const userIds = [
    ...new Set(
      links.flatMap((row) => {
        const record = row as { managerUserId?: string; reportUserId?: string };
        return [record.managerUserId, record.reportUserId].filter(
          (id): id is string => typeof id === "string",
        );
      }),
    ),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, firstName")
    .in("id", userIds);

  const labelById = new Map<string, string>();
  for (const row of profiles ?? []) {
    const record = row as { id?: string; email?: string | null; firstName?: string | null };
    if (record.id) labelById.set(record.id, memberLabel(record));
  }

  return links
    .map((row) => {
      const record = row as {
        id?: string;
        managerUserId?: string;
        reportUserId?: string;
        workplaceId?: string;
      };
      if (!record.id || !record.managerUserId || !record.reportUserId || !record.workplaceId) {
        return null;
      }
      return {
        id: record.id,
        managerUserId: record.managerUserId,
        reportUserId: record.reportUserId,
        workplaceId: record.workplaceId,
        managerLabel: labelById.get(record.managerUserId) ?? record.managerUserId,
        reportLabel: labelById.get(record.reportUserId) ?? record.reportUserId,
      };
    })
    .filter((link): link is ManagerDirectReportLink => link !== null);
}

export async function createManagerDirectReport(params: {
  workplaceId: string;
  managerUserId: string;
  reportUserId: string;
}): Promise<void> {
  if (params.managerUserId === params.reportUserId) {
    throw new Error("A manager cannot be their own direct report.");
  }

  const { error } = await supabase.from("managerDirectReport").insert({
    workplaceId: params.workplaceId,
    managerUserId: params.managerUserId,
    reportUserId: params.reportUserId,
  } as never);

  if (error) throw error;
}

export async function deleteManagerDirectReport(linkId: string): Promise<void> {
  const { error } = await supabase.from("managerDirectReport").delete().eq("id", linkId);
  if (error) throw error;
}
