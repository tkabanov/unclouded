import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  canManageWorkplaceMembers,
  userHasWorkplaceHrDelegateRole,
} from "./workplaceHrAuth.ts";

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

type UntypedClient = SupabaseClient;

function memberLabel(row: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  userId: string;
}): string {
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  const email = row.email?.trim();
  if (name && email) return `${name} (${email})`;
  return email ?? name ?? row.userId;
}

export { memberLabel as workplaceMemberLabel };

export async function assertCanManageWorkplaceMembers(
  admin: UntypedClient,
  params: {
    userId: string;
    userEmail: string | null;
    roleType: string | null;
    workplaceId: string;
  },
): Promise<{ workplace: { id: string; name: string; contactEmail: string } }> {
  const { data: workplace, error } = await admin
    .from("workplace")
    .select("id, name, contactEmail")
    .eq("id", params.workplaceId)
    .maybeSingle();

  if (error) throw error;
  if (!workplace) {
    throw new WorkplaceMemberError("Workplace not found", 404);
  }

  const hasDelegateHr = await userHasWorkplaceHrDelegateRole(admin, params.userId, params.workplaceId);

  if (
    !canManageWorkplaceMembers({
      userEmail: params.userEmail,
      roleType: params.roleType,
      workplaceContactEmail: workplace.contactEmail ?? null,
      hasHrDelegateRole: hasDelegateHr,
    })
  ) {
    throw new WorkplaceMemberError("Forbidden", 403);
  }

  return {
    workplace: {
      id: workplace.id,
      name: workplace.name,
      contactEmail: workplace.contactEmail,
    },
  };
}

export class WorkplaceMemberError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WorkplaceMemberError";
    this.status = status;
  }
}

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export async function listWorkplaceMemberRecords(
  admin: UntypedClient,
  workplaceId: string,
  contactEmail: string,
): Promise<WorkplaceMemberRecord[]> {
  const [
    { data: profiles, error: profilesError },
    { data: roles, error: rolesError },
    { data: invitations, error: invitationsError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, firstName, lastName, managesATeam, enrollmentDate")
      .eq("workplaceId", workplaceId)
      .order("firstName", { ascending: true }),
    admin
      .from("workplaceMemberRole")
      .select("userId, role")
      .eq("workplaceId", workplaceId),
    admin
      .from("workplaceInvitation")
      .select("id, email, createdAt")
      .eq("workplaceId", workplaceId)
      .eq("status", "pending")
      .order("createdAt", { ascending: false }),
  ]);

  if (profilesError) throw profilesError;
  if (rolesError) throw rolesError;
  if (invitationsError) throw invitationsError;

  const hrDelegates = new Set<string>();
  const managers = new Set<string>();
  for (const row of roles ?? []) {
    const record = row as { userId?: string; role?: string };
    if (!record.userId || !record.role) continue;
    if (record.role === "hr") hrDelegates.add(record.userId);
    if (record.role === "manager") managers.add(record.userId);
  }

  const primaryHrEmail = normalizeEmail(contactEmail);

  const activeMembers = (profiles ?? [])
    .map((row) => {
      const record = row as {
        id?: string;
        email?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        managesATeam?: boolean | null;
        enrollmentDate?: string | null;
      };
      if (!record.id) return null;

      const isPrimaryHr = primaryHrEmail !== "" && normalizeEmail(record.email) === primaryHrEmail;
      const isHrDelegate = hrDelegates.has(record.id);
      const isManager = managers.has(record.id) || record.managesATeam === true;

      return {
        memberStatus: "active",
        invitationId: null,
        userId: record.id,
        email: record.email ?? null,
        firstName: record.firstName ?? null,
        lastName: record.lastName ?? null,
        managesATeam: record.managesATeam === true,
        enrollmentDate: record.enrollmentDate ?? null,
        invitedAt: null,
        isPrimaryHr,
        isHrDelegate,
        isManager,
      } satisfies WorkplaceMemberRecord;
    })
    .filter((member): member is WorkplaceMemberRecord => member !== null);

  const enrolledEmails = new Set(
    activeMembers.map((member) => normalizeEmail(member.email)).filter((value) => value !== ""),
  );

  const pendingMembers = (invitations ?? [])
    .map((row) => {
      const record = row as { id?: string; email?: string | null; createdAt?: string | null };
      if (!record.id) return null;
      const email = record.email?.trim() ?? "";
      if (!email || enrolledEmails.has(normalizeEmail(email))) return null;

      return {
        memberStatus: "pending",
        invitationId: record.id,
        userId: null,
        email,
        firstName: null,
        lastName: null,
        managesATeam: false,
        enrollmentDate: null,
        invitedAt: record.createdAt ?? null,
        isPrimaryHr: false,
        isHrDelegate: false,
        isManager: false,
      } satisfies WorkplaceMemberRecord;
    })
    .filter((member): member is WorkplaceMemberRecord => member !== null);

  return [...pendingMembers, ...activeMembers];
}

export type AddWorkplaceMemberResult = {
  mode: "assigned" | "invited";
  alreadyEnrolled: boolean;
  invitationId: string | null;
  email: string;
};

export async function addWorkplaceMemberByEmail(
  userClient: UntypedClient,
  workplaceId: string,
  email: string,
): Promise<AddWorkplaceMemberResult> {
  const { data, error } = await userClient.rpc("assign_workplace_member_by_email", {
    p_workplace_id: workplaceId,
    p_email: email.trim(),
  });

  if (error) throw error;

  const payload = data as {
    ok?: boolean;
    error?: string;
    status?: number;
    alreadyEnrolled?: boolean;
    mode?: "assigned" | "invited";
    invitationId?: string;
    email?: string;
  };

  if (!payload?.ok) {
    throw new WorkplaceMemberError(payload.error ?? "Couldn't add member.", payload.status ?? 400);
  }

  if (payload.mode === "invited") {
    return {
      mode: "invited",
      alreadyEnrolled: false,
      invitationId: payload.invitationId ?? null,
      email: payload.email ?? email.trim().toLowerCase(),
    };
  }

  return {
    mode: "assigned",
    alreadyEnrolled: payload.alreadyEnrolled === true,
    invitationId: null,
    email: email.trim().toLowerCase(),
  };
}

export async function sendWorkplaceInvitationEmail(
  admin: UntypedClient,
  email: string,
): Promise<{ emailSent: boolean }> {
  const appUrl = Deno.env.get("APP_URL") ?? "http://127.0.0.1:3000";
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl.replace(/\/$/, "")}/onboarding`,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already") && message.includes("registered")) {
      return { emailSent: false };
    }
    throw new WorkplaceMemberError(error.message, 502);
  }

  return { emailSent: true };
}

export async function assignWorkplaceMemberByEmail(
  userClient: UntypedClient,
  workplaceId: string,
  email: string,
): Promise<{ alreadyEnrolled: boolean }> {
  const result = await addWorkplaceMemberByEmail(userClient, workplaceId, email);
  if (result.mode === "invited") {
    throw new WorkplaceMemberError(
      "No account found for that email. Use invite instead.",
      404,
    );
  }
  return { alreadyEnrolled: result.alreadyEnrolled };
}

export async function cancelWorkplaceInvitation(
  userClient: UntypedClient,
  workplaceId: string,
  invitationId: string,
): Promise<void> {
  const { data, error } = await userClient.rpc("cancel_workplace_invitation", {
    p_workplace_id: workplaceId,
    p_invitation_id: invitationId,
  });

  if (error) throw error;

  const payload = data as { ok?: boolean; error?: string; status?: number };
  if (!payload?.ok) {
    throw new WorkplaceMemberError(payload.error ?? "Couldn't cancel invitation.", payload.status ?? 400);
  }
}

export async function unassignWorkplaceMember(
  userClient: UntypedClient,
  workplaceId: string,
  targetUserId: string,
): Promise<void> {
  const { data, error } = await userClient.rpc("unassign_workplace_member", {
    p_workplace_id: workplaceId,
    p_target_user_id: targetUserId,
  });

  if (error) throw error;

  const payload = data as { ok?: boolean; error?: string; status?: number };
  if (!payload?.ok) {
    throw new WorkplaceMemberError(payload.error ?? "Couldn't remove member.", payload.status ?? 400);
  }
}

export async function setWorkplaceMemberRole(
  userClient: UntypedClient,
  workplaceId: string,
  targetUserId: string,
  role: WorkplaceMemberRole,
  enabled: boolean,
): Promise<void> {
  const { data, error } = await userClient.rpc("set_workplace_member_role", {
    p_workplace_id: workplaceId,
    p_target_user_id: targetUserId,
    p_role: role,
    p_enabled: enabled,
  });

  if (error) throw error;

  const payload = data as { ok?: boolean; error?: string; status?: number };
  if (!payload?.ok) {
    throw new WorkplaceMemberError(payload.error ?? "Couldn't update role.", payload.status ?? 400);
  }
}

export async function listHrWorkplaceIdsForUser(
  admin: UntypedClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from("workplaceMemberRole")
    .select("workplaceId")
    .eq("userId", userId)
    .eq("role", "hr");

  if (error) throw error;

  return (data ?? [])
    .map((row) => (row as { workplaceId?: string }).workplaceId)
    .filter((id): id is string => typeof id === "string");
}
