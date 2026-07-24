import { describe, expect, it } from "vitest";

import { shouldShowWorkplaceAggregateOptIn } from "./SettingsWorkplaceAggregateSection";

describe("shouldShowWorkplaceAggregateOptIn", () => {
  it("shows for enrolled workplace members", () => {
    expect(
      shouldShowWorkplaceAggregateOptIn({
        workplaceId: "ab0c2036-08dc-479f-9246-89904acacd05",
        isHrContact: false,
      }),
    ).toBe(true);
  });

  it("shows for HR contacts without workplace enrollment", () => {
    expect(
      shouldShowWorkplaceAggregateOptIn({
        workplaceId: null,
        isHrContact: true,
      }),
    ).toBe(true);
  });

  it("hides for users with no workplace link and no HR access", () => {
    expect(
      shouldShowWorkplaceAggregateOptIn({
        workplaceId: null,
        isHrContact: false,
      }),
    ).toBe(false);
  });
});
