import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctionErrors";

export type WorkplaceMemberRole = "hr" | "manager";
export type WorkplaceMemberStatus = "active" | "pending";

export type WorkplaceMemberRecord = {
  memberStatus: WorkplaceMemberStatus;
  invitationId: string | null;
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  managesATeam: boolean;
  enrollmentDate: string | null;
  invitedAt: string | null;
  isPrimaryHr: boolean;
  isHrDelegate: boolean;
  isManager: boolean;
};

type MembersResponse = {
  ok?: boolean;
  error?: string;
  members?: WorkplaceMemberRecord[];
  mode?: "assigned" | "invited";
  alreadyEnrolled?: boolean;
  emailSent?: boolean;
};

async function invokeWorkplaceMembers(body: Record<string, unknown>): Promise<MembersResponse> {
  const { data, error } = await supabase.functions.invoke("workplace-members", { body });
  const payload = data as MembersResponse | null;

  if (!payload?.ok) {
    throw new Error(
      getEdgeFunctionErrorMessage(data, error, "Couldn't manage workplace members."),
    );
  }

  return payload;
}

export async function fetchWorkplaceMembers(
  workplaceId: string,
): Promise<WorkplaceMemberRecord[]> {
  const payload = await invokeWorkplaceMembers({ workplaceId, action: "list" });
  return payload.members ?? [];
}

export async function addOrInviteWorkplaceMemberByEmail(
  workplaceId: string,
  email: string,
): Promise<{
  members: WorkplaceMemberRecord[];
  mode: "assigned" | "invited";
  alreadyEnrolled: boolean;
  emailSent: boolean;
}> {
  const payload = await invokeWorkplaceMembers({
    workplaceId,
    action: "invite",
    email: email.trim(),
  });
  return {
    members: payload.members ?? [],
    mode: payload.mode === "assigned" ? "assigned" : "invited",
    alreadyEnrolled: payload.alreadyEnrolled === true,
    emailSent: payload.emailSent === true,
  };
}

export async function cancelWorkplaceInvitation(
  workplaceId: string,
  invitationId: string,
): Promise<WorkplaceMemberRecord[]> {
  const payload = await invokeWorkplaceMembers({
    workplaceId,
    action: "cancelInvite",
    invitationId,
  });
  return payload.members ?? [];
}

export async function unassignWorkplaceMember(
  workplaceId: string,
  userId: string,
): Promise<WorkplaceMemberRecord[]> {
  const payload = await invokeWorkplaceMembers({
    workplaceId,
    action: "unassign",
    userId,
  });
  return payload.members ?? [];
}

export async function setWorkplaceMemberRole(
  workplaceId: string,
  userId: string,
  role: WorkplaceMemberRole,
  enabled: boolean,
): Promise<WorkplaceMemberRecord[]> {
  const payload = await invokeWorkplaceMembers({
    workplaceId,
    action: "setRole",
    userId,
    role,
    enabled,
  });
  return payload.members ?? [];
}

export function workplaceMemberDisplayName(member: WorkplaceMemberRecord): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  const email = member.email?.trim();
  if (name && email) return `${name} (${email})`;
  return email ?? name ?? member.userId ?? "Pending invite";
}

export function workplaceMemberRowKey(member: WorkplaceMemberRecord): string {
  return member.invitationId ?? member.userId ?? member.email ?? "unknown";
}
