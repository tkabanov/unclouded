import { supabase } from "@/integrations/supabase/client";

export type WorkplaceMemberSettings = {
  workplaceId: string | null;
  managerAggregateOptIn: boolean;
  managesATeam: boolean | null;
};

export async function loadWorkplaceMemberSettings(
  userId: string,
): Promise<WorkplaceMemberSettings> {
  const { data, error } = await supabase
    .from("profiles")
    .select("workplaceId, managerAggregateOptIn, managesATeam")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return {
    workplaceId: typeof data?.workplaceId === "string" ? data.workplaceId : null,
    managerAggregateOptIn: data?.managerAggregateOptIn === true,
    managesATeam: data?.managesATeam ?? null,
  };
}

export async function saveManagerAggregateOptIn(
  userId: string,
  optIn: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ managerAggregateOptIn: optIn } as never)
    .eq("id", userId);

  if (error) throw error;
}
