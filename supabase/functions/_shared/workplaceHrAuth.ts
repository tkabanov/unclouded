/** REQ-10 — HR contact authorization for employer portal metrics. */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isWorkplaceHrContact(
  userEmail: string | null | undefined,
  workplaceContactEmail: string | null | undefined,
): boolean {
  if (!userEmail?.trim() || !workplaceContactEmail?.trim()) return false;
  return normalizeEmail(userEmail) === normalizeEmail(workplaceContactEmail);
}

export type WorkplaceRecord = {
  id: string;
  name: string;
  contactEmail: string;
};

export function filterWorkplacesForHrContact(
  workplaces: WorkplaceRecord[],
  userEmail: string | null | undefined,
): WorkplaceRecord[] {
  if (!userEmail?.trim()) return [];
  return workplaces.filter((workplace) =>
    isWorkplaceHrContact(userEmail, workplace.contactEmail),
  );
}

export function canAccessWorkplaceMetrics(params: {
  userEmail: string | null | undefined;
  roleType: string | null | undefined;
  workplaceContactEmail: string | null | undefined;
  hasHrDelegateRole?: boolean;
}): boolean {
  if (params.roleType === "admin") return true;
  if (params.hasHrDelegateRole) return true;
  return isWorkplaceHrContact(params.userEmail, params.workplaceContactEmail);
}

export function canManageWorkplaceMembers(params: {
  userEmail: string | null | undefined;
  roleType: string | null | undefined;
  workplaceContactEmail: string | null | undefined;
  hasHrDelegateRole?: boolean;
}): boolean {
  return canAccessWorkplaceMetrics(params);
}

export async function userHasWorkplaceHrDelegateRole(
  admin: SupabaseClient,
  userId: string,
  workplaceId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("workplaceMemberRole")
    .select("id")
    .eq("workplaceId", workplaceId)
    .eq("userId", userId)
    .eq("role", "hr")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function canAccessWorkplaceHrPortal(
  admin: SupabaseClient,
  params: {
    userId: string;
    userEmail: string | null | undefined;
    roleType: string | null | undefined;
    workplaceId: string;
    workplaceContactEmail: string | null | undefined;
  },
): Promise<boolean> {
  if (
    canAccessWorkplaceMetrics({
      userEmail: params.userEmail,
      roleType: params.roleType,
      workplaceContactEmail: params.workplaceContactEmail,
    })
  ) {
    return true;
  }

  return userHasWorkplaceHrDelegateRole(admin, params.userId, params.workplaceId);
}
