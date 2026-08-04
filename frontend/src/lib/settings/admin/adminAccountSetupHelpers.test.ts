import { describe, expect, it } from "vitest";
import { isConsumerPathActive } from "@/lib/paths/pathsCatalogApi";
import {
  aggregateClassificationDistribution,
  countActiveUsers,
  countTierUsers,
  type AdminAnalyticsProfileRow,
} from "@/lib/settings/admin/adminAnalyticsApi";

describe("isConsumerPathActive", () => {
  it("defaults missing flag to active", () => {
    expect(isConsumerPathActive(undefined)).toBe(true);
    expect(isConsumerPathActive(null)).toBe(true);
    expect(isConsumerPathActive(true)).toBe(true);
  });

  it("treats false as inactive", () => {
    expect(isConsumerPathActive(false)).toBe(false);
  });
});

describe("admin analytics helpers", () => {
  const profiles: AdminAnalyticsProfileRow[] = [
    {
      isActive: true,
      tier: "pro",
      subscribed: true,
      results: { classification: { name: "Capacity Erosion" } },
    },
    {
      isActive: false,
      tier: "premium",
      subscribed: true,
      results: { classification: { name: "Capacity Erosion" } },
    },
    {
      isActive: true,
      accountType: "enterprise",
      enterpriseTier: "premium",
      results: { classification: { key: "building_momentum", name: "Building Momentum" } },
    },
  ];

  it("counts active users", () => {
    expect(countActiveUsers(profiles)).toBe(2);
  });

  it("counts pro and premium users", () => {
    expect(countTierUsers(profiles, "pro")).toBe(1);
    expect(countTierUsers(profiles, "premium")).toBe(2);
  });

  it("aggregates classification distribution", () => {
    expect(aggregateClassificationDistribution(profiles)).toEqual([
      { label: "Capacity Erosion", count: 2 },
      { label: "Building Momentum", count: 1 },
    ]);
  });
});
