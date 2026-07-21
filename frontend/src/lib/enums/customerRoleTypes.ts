import {
  CUSTOMER_ROLE,
  CUSTOMER_ROLE_LABELS,
  CUSTOMER_ROLE_ORDER,
  type CustomerRoleSlug,
} from "@/lib/enums/customerProfile";

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

/** Prefer roleTypes array; fall back to legacy single roleType (excluding admin). */
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

/** First role in canonical onboarding order — used for performance copy and legacy roleType sync. */
export function resolvePrimaryCustomerRole(
  roles: readonly CustomerRoleSlug[],
): CustomerRoleSlug {
  if (roles.length === 0) return CUSTOMER_ROLE.PRO;

  for (const ordered of CUSTOMER_ROLE_ORDER) {
    if (roles.includes(ordered)) return ordered;
  }

  return roles[0];
}

export function syncLegacyRoleType(roles: readonly CustomerRoleSlug[]): string | null {
  if (roles.length === 0) return null;
  return resolvePrimaryCustomerRole(roles);
}

export function formatCustomerRoleTypesForDisplay(
  roles: readonly CustomerRoleSlug[],
): string {
  return roles.map((role) => CUSTOMER_ROLE_LABELS[role]).join(", ");
}

export function profileHasCustomerRole(
  roleTypes: readonly string[] | null | undefined,
  legacyRoleType: string | null | undefined,
  slug: CustomerRoleSlug,
): boolean {
  return parseCustomerRoleTypesFromProfile(roleTypes, legacyRoleType).includes(slug);
}

export function toggleCustomerRoleSelection(
  selected: readonly CustomerRoleSlug[],
  slug: CustomerRoleSlug,
): CustomerRoleSlug[] {
  if (selected.includes(slug)) {
    return selected.filter((role) => role !== slug);
  }
  return [...selected, slug];
}
