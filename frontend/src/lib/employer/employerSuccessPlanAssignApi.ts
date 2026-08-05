import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctionErrors";

export type SuccessPlanCatalogItem = {
  id: string;
  name: string;
  sessionsCount: number | null;
};

export type SuccessPlanAssignment = {
  id: string;
  userId: string;
  pathId: string;
  status: string;
  source: string;
  createdAt?: string;
};

export type SuccessPlanAssignListResult = {
  plans: SuccessPlanCatalogItem[];
  assignments: SuccessPlanAssignment[];
  members: Array<{
    userId: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    memberStatus: string;
  }>;
};

export async function listWorkplaceSuccessPlanAssignments(
  workplaceId: string,
): Promise<SuccessPlanAssignListResult> {
  const { data, error } = await supabase.functions.invoke(
    "workplace-assign-success-plan",
    { body: { workplaceId, action: "list" } },
  );

  if (error || !data || (data as { ok?: boolean }).ok !== true) {
    throw new Error(
      getEdgeFunctionErrorMessage(data, error, "Couldn't load Success Plan assignments."),
    );
  }

  const payload = data as {
    plans?: SuccessPlanCatalogItem[];
    assignments?: SuccessPlanAssignment[];
    members?: SuccessPlanAssignListResult["members"];
  };

  return {
    plans: payload.plans ?? [],
    assignments: payload.assignments ?? [],
    members: (payload.members ?? []).filter((m) => m.memberStatus === "active" && m.userId),
  };
}

export async function assignWorkplaceSuccessPlan(input: {
  workplaceId: string;
  userId: string;
  pathId: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke(
    "workplace-assign-success-plan",
    {
      body: {
        workplaceId: input.workplaceId,
        action: "assign",
        userId: input.userId,
        pathId: input.pathId,
      },
    },
  );

  if (error || !data || (data as { ok?: boolean }).ok !== true) {
    throw new Error(
      getEdgeFunctionErrorMessage(data, error, "Couldn't assign Success Plan."),
    );
  }
}

export async function unassignWorkplaceSuccessPlan(input: {
  workplaceId: string;
  enrollmentId: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke(
    "workplace-assign-success-plan",
    {
      body: {
        workplaceId: input.workplaceId,
        action: "unassign",
        enrollmentId: input.enrollmentId,
      },
    },
  );

  if (error || !data || (data as { ok?: boolean }).ok !== true) {
    throw new Error(
      getEdgeFunctionErrorMessage(data, error, "Couldn't remove Success Plan assignment."),
    );
  }
}
