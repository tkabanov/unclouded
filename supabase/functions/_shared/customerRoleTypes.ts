export const CUSTOMER_ROLE = {
  PRO: "pro",
  STUDENT: "student",
  CAREGIVER: "caregiver",
  TRANSITION: "transition",
  RETIRED: "retired",
} as const;

export type CustomerRoleSlug = (typeof CUSTOMER_ROLE)[keyof typeof CUSTOMER_ROLE];

export const CUSTOMER_ROLE_ORDER: readonly CustomerRoleSlug[] = [
  CUSTOMER_ROLE.PRO,
  CUSTOMER_ROLE.STUDENT,
  CUSTOMER_ROLE.CAREGIVER,
  CUSTOMER_ROLE.TRANSITION,
  CUSTOMER_ROLE.RETIRED,
];

export function isCustomerRoleSlug(value: string): value is CustomerRoleSlug {
  return Object.values(CUSTOMER_ROLE).includes(value as CustomerRoleSlug);
}

export function normalizeCustomerRoleTypes(
  values: readonly string[] | null | undefined,
): CustomerRoleSlug[] {
  if (!values?.length) return [];

  const seen = new Set<CustomerRoleSlug>();
  const result: CustomerRoleSlug[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || !isCustomerRoleSlug(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

export function parseCustomerRoleTypesFromProfile(
  roleTypes: readonly string[] | null | undefined,
  legacyRoleType: string | null | undefined,
): CustomerRoleSlug[] {
  const fromArray = normalizeCustomerRoleTypes(roleTypes);
  if (fromArray.length > 0) return fromArray;

  const legacy = legacyRoleType?.trim();
  if (legacy && legacy !== "admin" && isCustomerRoleSlug(legacy)) {
    return [legacy];
  }

  return [];
}

export function resolvePrimaryCustomerRole(
  roles: readonly CustomerRoleSlug[],
): CustomerRoleSlug {
  if (roles.length === 0) return CUSTOMER_ROLE.PRO;

  for (const ordered of CUSTOMER_ROLE_ORDER) {
    if (roles.includes(ordered)) return ordered;
  }

  return roles[0];
}

export function formatCustomerRoleTypesForDisplay(
  roles: readonly CustomerRoleSlug[],
  labels: Record<CustomerRoleSlug, string>,
): string {
  return roles.map((role) => labels[role]).join(", ");
}

export function profileHasCustomerRole(
  roleTypes: readonly string[] | null | undefined,
  legacyRoleType: string | null | undefined,
  slug: CustomerRoleSlug,
): boolean {
  return parseCustomerRoleTypesFromProfile(roleTypes, legacyRoleType).includes(slug);
}
