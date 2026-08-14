import { describe, expect, it } from "vitest";

import { isWorkplaceEnrollmentLocked } from "./workplaceEnrollmentLock";

describe("isWorkplaceEnrollmentLocked", () => {
  it("treats missing workplace as unlocked", () => {
    expect(isWorkplaceEnrollmentLocked(null)).toBe(false);
    expect(isWorkplaceEnrollmentLocked(undefined)).toBe(false);
  });

  it("locks when isActive is false", () => {
    expect(isWorkplaceEnrollmentLocked({ isActive: false })).toBe(true);
  });

  it("does not lock an active contract", () => {
    expect(
      isWorkplaceEnrollmentLocked({
        isActive: true,
        contractStartDate: "2026-01-01",
        contractEndDate: "2027-12-31",
      }),
    ).toBe(false);
  });

  it("locks after the contract end date", () => {
    expect(
      isWorkplaceEnrollmentLocked({
        isActive: true,
        contractStartDate: "2025-01-01",
        contractEndDate: "2025-12-31",
      }),
    ).toBe(true);
  });
});
