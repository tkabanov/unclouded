/** REQ-10 — HR contact authorization for employer portal metrics. */

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
}): boolean {
  if (params.roleType === "admin") return true;
  return isWorkplaceHrContact(params.userEmail, params.workplaceContactEmail);
}
