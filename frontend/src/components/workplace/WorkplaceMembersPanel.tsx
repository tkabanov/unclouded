import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import AdminManagerDirectReportsPanel from "@/components/settings/admin/AdminManagerDirectReportsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  addOrInviteWorkplaceMemberByEmail,
  cancelWorkplaceInvitation,
  fetchWorkplaceMembers,
  setWorkplaceMemberRole,
  unassignWorkplaceMember,
  workplaceMemberDisplayName,
  workplaceMemberRowKey,
  type WorkplaceMemberRecord,
} from "@/lib/workplace/workplaceMembersApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

type WorkplaceMembersPanelProps = {
  workplaceId: string;
  disabled?: boolean;
  compact?: boolean;
  showDirectReports?: boolean;
  className?: string;
};

export default function WorkplaceMembersPanel({
  workplaceId,
  disabled = false,
  compact = false,
  showDirectReports = true,
  className,
}: WorkplaceMembersPanelProps) {
  const [members, setMembers] = useState<WorkplaceMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchWorkplaceMembers(workplaceId);
      setMembers(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load workplace members.");
    } finally {
      setLoading(false);
    }
  }, [workplaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAddOrInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed || disabled || busy) return;

    setBusy(true);
    try {
      const result = await addOrInviteWorkplaceMemberByEmail(workplaceId, trimmed);
      setMembers(result.members);
      setEmail("");

      if (result.mode === "invited") {
        toast.success(
          result.emailSent
            ? "Invitation email sent. They'll join this workplace when they create their account."
            : "Invitation saved. They'll join this workplace when they sign up with this email.",
        );
      } else if (result.alreadyEnrolled) {
        toast.success("That person is already enrolled in this workplace.");
      } else {
        toast.success("Member added to the workplace.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add or invite member.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelInvite = async (member: WorkplaceMemberRecord) => {
    if (disabled || busy || !member.invitationId) return;

    setBusy(true);
    try {
      const rows = await cancelWorkplaceInvitation(workplaceId, member.invitationId);
      setMembers(rows);
      toast.success("Invitation cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel invitation.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnassign = async (member: WorkplaceMemberRecord) => {
    if (disabled || busy || !member.userId) return;
    if (member.isPrimaryHr) {
      toast.error("Primary HR is set on the workplace contact email. Edit the workplace to change it.");
      return;
    }

    setBusy(true);
    try {
      const rows = await unassignWorkplaceMember(workplaceId, member.userId);
      setMembers(rows);
      toast.success("Member removed from the workplace.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove member.");
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (
    member: WorkplaceMemberRecord,
    role: "hr" | "manager",
    enabled: boolean,
  ) => {
    if (disabled || busy || !member.userId) return;
    if (role === "hr" && member.isPrimaryHr && !enabled) {
      toast.error("Primary HR access comes from the workplace contact email.");
      return;
    }

    setBusy(true);
    try {
      const rows = await setWorkplaceMemberRole(workplaceId, member.userId, role, enabled);
      setMembers(rows);
      toast.success(enabled ? "Role granted." : "Role removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update role.");
    } finally {
      setBusy(false);
    }
  };

  const activeMembers = members.filter((member) => member.memberStatus === "active");

  return (
    <div
      className={cn(
        bubbleStyle(compact ? "Group_card_muted_" : "Group_card_"),
        "flex flex-col gap-4 p-4",
        className,
      )}
    >
      <header className="space-y-1">
        <h3 className={bubbleStyle("Text_heading_3_")}>Workplace members</h3>
        <p className="text-xs text-muted-foreground">
          Add an existing account or send an email invitation. When invitees sign up, they are
          enrolled automatically. Primary HR remains the workplace contact email (admin editable).
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={`workplace-member-email-${workplaceId}`}>Email address</Label>
          <Input
            id={`workplace-member-email-${workplaceId}`}
            type="email"
            placeholder="employee@company.com"
            value={email}
            disabled={disabled || busy}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAddOrInvite();
              }
            }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || busy || !email.trim()}
          onClick={() => void handleAddOrInvite()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add / invite
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No members or pending invitations yet. Add an email above or share an enrollment code.
        </p>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => {
            const isPending = member.memberStatus === "pending";
            const hrEnabled = member.isPrimaryHr || member.isHrDelegate;

            return (
              <li
                key={workplaceMemberRowKey(member)}
                className="rounded-md border border-border bg-background/60 p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {workplaceMemberDisplayName(member)}
                    </p>
                    {isPending ? (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        Invitation pending
                      </p>
                    ) : null}
                    {member.isPrimaryHr ? (
                      <p className="text-xs text-muted-foreground">Primary HR (contact email)</p>
                    ) : null}
                  </div>
                  {isPending ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled || busy}
                      onClick={() => void handleCancelInvite(member)}
                    >
                      Cancel invite
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled || busy || member.isPrimaryHr}
                      onClick={() => void handleUnassign(member)}
                    >
                      <UserMinus className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>

                {!isPending ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">HR access</p>
                        <p className="text-xs text-muted-foreground">Can use employer portal</p>
                      </div>
                      <Switch
                        checked={hrEnabled}
                        disabled={disabled || busy || member.isPrimaryHr}
                        onCheckedChange={(checked) => void handleRoleChange(member, "hr", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Manager</p>
                        <p className="text-xs text-muted-foreground">
                          Team aggregate + direct reports
                        </p>
                      </div>
                      <Switch
                        checked={member.isManager}
                        disabled={disabled || busy}
                        onCheckedChange={(checked) =>
                          void handleRoleChange(member, "manager", checked)
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {showDirectReports && activeMembers.some((member) => member.isManager) ? (
        <AdminManagerDirectReportsPanel workplaceId={workplaceId} disabled={disabled || busy} />
      ) : null}
    </div>
  );
}
