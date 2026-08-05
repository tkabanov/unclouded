import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  assignWorkplaceSuccessPlan,
  listWorkplaceSuccessPlanAssignments,
  unassignWorkplaceSuccessPlan,
  type SuccessPlanAssignListResult,
} from "@/lib/employer/employerSuccessPlanAssignApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

type EmployerSuccessPlanAssignPanelProps = {
  workplaceId: string;
  disabled?: boolean;
  className?: string;
};

function memberLabel(member: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  userId: string | null;
}): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  if (name && member.email) return `${name} (${member.email})`;
  return member.email ?? name ?? member.userId ?? "Member";
}

export default function EmployerSuccessPlanAssignPanel({
  workplaceId,
  disabled = false,
  className,
}: EmployerSuccessPlanAssignPanelProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<SuccessPlanAssignListResult | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPathId, setSelectedPathId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listWorkplaceSuccessPlanAssignments(workplaceId);
      setData(next);
      setSelectedUserId((current) =>
        current && next.members.some((m) => m.userId === current)
          ? current
          : (next.members[0]?.userId ?? ""),
      );
      setSelectedPathId((current) =>
        current && next.plans.some((p) => p.id === current)
          ? current
          : (next.plans[0]?.id ?? ""),
      );
    } catch (error) {
      console.error(error);
      setData(null);
      toast.error(
        error instanceof Error ? error.message : "Couldn't load Success Plan assignments.",
      );
    } finally {
      setLoading(false);
    }
  }, [workplaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pathNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of data?.plans ?? []) map.set(plan.id, plan.name);
    return map;
  }, [data?.plans]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of data?.members ?? []) {
      if (member.userId) map.set(member.userId, memberLabel(member));
    }
    return map;
  }, [data?.members]);

  const handleAssign = async () => {
    if (!selectedUserId || !selectedPathId) return;
    setBusy(true);
    try {
      await assignWorkplaceSuccessPlan({
        workplaceId,
        userId: selectedUserId,
        pathId: selectedPathId,
      });
      toast.success("Success Plan assigned.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't assign Success Plan.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnassign = async (enrollmentId: string) => {
    setBusy(true);
    try {
      await unassignWorkplaceSuccessPlan({ workplaceId, enrollmentId });
      toast.success("Assignment removed.");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't remove assignment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={cn(
        bubbleStyle("Group_card_"),
        "mt-4 space-y-4 p-5",
        className,
      )}
    >
      <header className="space-y-1">
        <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold")}>
          Assign Success Plans
        </h2>
        <p className="text-sm text-muted-foreground">
          Assign any of the 7 Success Plans to a workplace member. Free seats can complete
          assigned plans without a personal add-on purchase.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No Success Plans are available in the catalog yet.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Employee</span>
              <select
                className="rounded-md border border-input bg-background px-3 py-2"
                value={selectedUserId}
                disabled={disabled || busy || data.members.length === 0}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {data.members.length === 0 ? (
                  <option value="">No active members</option>
                ) : (
                  data.members.map((member) => (
                    <option key={member.userId!} value={member.userId!}>
                      {memberLabel(member)}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Success Plan</span>
              <select
                className="rounded-md border border-input bg-background px-3 py-2"
                value={selectedPathId}
                disabled={disabled || busy}
                onChange={(event) => setSelectedPathId(event.target.value)}
              >
                {data.plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Button
            type="button"
            disabled={disabled || busy || !selectedUserId || !selectedPathId}
            onClick={() => void handleAssign()}
          >
            Assign Success Plan
          </Button>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current assignments</h3>
            {data.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                  >
                    <span>
                      {memberNameById.get(assignment.userId) ?? assignment.userId}
                      {" — "}
                      {pathNameById.get(assignment.pathId) ?? assignment.pathId}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled || busy}
                      onClick={() => void handleUnassign(assignment.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
