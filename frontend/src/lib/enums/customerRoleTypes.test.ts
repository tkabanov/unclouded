import { describe, expect, it } from "vitest";

import { CUSTOMER_ROLE } from "@/lib/enums/customerProfile";
import {
  normalizeCustomerRoleTypes,
  parseCustomerRoleTypesFromProfile,
  resolvePrimaryCustomerRole,
  syncLegacyRoleType,
  toggleCustomerRoleSelection,
} from "@/lib/enums/customerRoleTypes";

describe("customerRoleTypes", () => {
  it("normalizes and dedupes role slugs", () => {
    expect(normalizeCustomerRoleTypes(["pro", "pro", "student", "invalid"])).toEqual([
      CUSTOMER_ROLE.PRO,
      CUSTOMER_ROLE.STUDENT,
    ]);
  });

  it("falls back to legacy roleType when roleTypes is empty", () => {
    expect(parseCustomerRoleTypesFromProfile([], "caregiver")).toEqual([CUSTOMER_ROLE.CAREGIVER]);
    expect(parseCustomerRoleTypesFromProfile(null, "admin")).toEqual([]);
  });

  it("resolves primary role by canonical order", () => {
    expect(resolvePrimaryCustomerRole([CUSTOMER_ROLE.CAREGIVER, CUSTOMER_ROLE.PRO])).toBe(
      CUSTOMER_ROLE.PRO,
    );
  });

  it("syncs legacy roleType from multi-select", () => {
    expect(syncLegacyRoleType([CUSTOMER_ROLE.STUDENT, CUSTOMER_ROLE.CAREGIVER])).toBe(
      CUSTOMER_ROLE.STUDENT,
    );
  });

  it("toggles role selection", () => {
    expect(toggleCustomerRoleSelection([CUSTOMER_ROLE.PRO], CUSTOMER_ROLE.STUDENT)).toEqual([
      CUSTOMER_ROLE.PRO,
      CUSTOMER_ROLE.STUDENT,
    ]);
    expect(toggleCustomerRoleSelection([CUSTOMER_ROLE.PRO], CUSTOMER_ROLE.PRO)).toEqual([]);
  });
});
