import { describe, expect, it } from "vitest";

import {
  aggregateModuleCompletionStats,
  type AdminAnalyticsProfileRow,
} from "./adminAnalyticsApi";

describe("aggregateModuleCompletionStats", () => {
  it("counts users with modules and per-module completion from flags", () => {
    const profiles: AdminAnalyticsProfileRow[] = [
      {
        modulesCompletedCount: 2,
        moduleIdentityComplete: true,
        moduleBodyComplete: true,
      },
      {
        modulesCompletedCount: 0,
        moduleHistoryComplete: false,
      },
      {
        modulesCompletedCount: 1,
        onboardingData: {
          module_relational_complete: true,
        },
      },
    ];

    const stats = aggregateModuleCompletionStats(profiles);

    expect(stats.usersWithOneOrMoreModules).toBe(2);
    expect(stats.averageModulesCompleted).toBe(1);
    expect(stats.moduleCompletionCounts.identity).toBe(1);
    expect(stats.moduleCompletionCounts.body).toBe(1);
    expect(stats.moduleCompletionCounts.relational).toBe(1);
    expect(stats.moduleCompletionCounts.history).toBe(0);
  });

  it("returns zeros for empty profile list", () => {
    const stats = aggregateModuleCompletionStats([]);

    expect(stats.usersWithOneOrMoreModules).toBe(0);
    expect(stats.averageModulesCompleted).toBe(0);
    expect(stats.moduleCompletionCounts.identity).toBe(0);
  });
});
