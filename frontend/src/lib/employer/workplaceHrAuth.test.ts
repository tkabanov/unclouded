import { describe, expect, it } from "vitest";

import {
  canAccessWorkplaceMetrics,
  filterWorkplacesForHrContact,
  isWorkplaceHrContact,
  normalizeEmail,
} from "../../../../supabase/functions/_shared/workplaceHrAuth.ts";

describe("workplaceHrAuth", () => {
  it("matches HR contact by normalized email", () => {
    expect(isWorkplaceHrContact("HR@Company.com", " hr@company.com ")).toBe(true);
    expect(isWorkplaceHrContact("other@company.com", "hr@company.com")).toBe(false);
  });

  it("filters workplaces for the signed-in HR contact", () => {
    const workplaces = [
      { id: "w1", name: "Acme", contactEmail: "hr@acme.com" },
      { id: "w2", name: "Beta", contactEmail: "people@beta.com" },
    ];

    expect(filterWorkplacesForHrContact(workplaces, "HR@acme.com")).toEqual([workplaces[0]]);
  });

  it("allows settings admin or matching HR contact", () => {
    expect(
      canAccessWorkplaceMetrics({
        userEmail: "hr@acme.com",
        roleType: "founder",
        workplaceContactEmail: "hr@acme.com",
      }),
    ).toBe(true);

    expect(
      canAccessWorkplaceMetrics({
        userEmail: "hr@acme.com",
        roleType: "admin",
        workplaceContactEmail: "other@acme.com",
      }),
    ).toBe(true);

    expect(
      canAccessWorkplaceMetrics({
        userEmail: "employee@acme.com",
        roleType: "founder",
        workplaceContactEmail: "hr@acme.com",
      }),
    ).toBe(false);

    expect(
      canAccessWorkplaceMetrics({
        userEmail: "delegate@acme.com",
        roleType: "founder",
        workplaceContactEmail: "hr@acme.com",
        hasHrDelegateRole: true,
      }),
    ).toBe(true);
  });

  it("normalizes email casing and whitespace", () => {
    expect(normalizeEmail("  HR@Company.com ")).toBe("hr@company.com");
  });
});
