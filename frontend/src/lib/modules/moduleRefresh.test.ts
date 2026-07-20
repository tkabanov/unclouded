import { describe, expect, it } from "vitest";

import type { ResultsData } from "@/lib/classification";

import {
  accelerateModuleUnlock,
  buildLifeEventModuleRefreshPatch,
  buildReassessmentModuleRefreshPatch,
  buildUserInitiatedRefreshPatch,
  computeSignificantShiftDeltas,
  mapLifeEventToModuleSlugs,
  mapScoreDropToModuleSlugs,
  offerModuleRefresh,
} from "./moduleRefresh";
import { readModuleSchedules } from "./readModuleProfile";

const BASE_RESULTS = {
  stability_score: 3.5,
  performance_score: 3.5,
  alignment_score: 3.5,
  orientation_score: 3.5,
} as ResultsData;

const NOW = new Date("2026-10-15T12:00:00.000Z");

describe("moduleRefresh", () => {
  it("offers refresh on completed modules", () => {
    const schedules = offerModuleRefresh(
      {
        identity: {
          scheduledAt: "2026-07-17T00:00:00.000Z",
          unlockedAt: "2026-07-17T00:00:00.000Z",
          completedAt: "2026-07-20T00:00:00.000Z",
        },
      },
      ["identity"],
      "user_initiated",
      NOW,
    );

    expect(schedules.identity?.refreshOfferedAt).toBe(NOW.toISOString());
    expect(schedules.identity?.refreshReason).toBe("user_initiated");
  });

  it("accelerates unlock for locked modules", () => {
    const schedules = accelerateModuleUnlock(
      {
        body: {
          scheduledAt: "2026-12-01T00:00:00.000Z",
          unlockedAt: null,
          completedAt: null,
        },
      },
      ["body"],
      NOW,
    );

    expect(schedules.body?.scheduledAt).toBe(NOW.toISOString());
    expect(schedules.body?.unlockedAt).toBe(NOW.toISOString());
  });

  it("maps score drops to relevant module slugs", () => {
    const deltas = computeSignificantShiftDeltas(
      BASE_RESULTS,
      {
        ...BASE_RESULTS,
        performance_score: 2.4,
      } as ResultsData,
    );

    expect(mapScoreDropToModuleSlugs(deltas)).toEqual(["identity"]);
  });

  it("builds reassessment refresh patch for completed and locked modules", () => {
    const patch = buildReassessmentModuleRefreshPatch(
      {
        moduleIdentityComplete: true,
        moduleSchedules: {
          identity: {
            scheduledAt: "2026-07-17T00:00:00.000Z",
            unlockedAt: "2026-07-17T00:00:00.000Z",
            completedAt: "2026-07-20T00:00:00.000Z",
          },
          body: {
            scheduledAt: "2026-12-01T00:00:00.000Z",
            unlockedAt: null,
            completedAt: null,
          },
        },
      },
      BASE_RESULTS,
      BASE_RESULTS,
      NOW,
    );

    expect(patch.refreshOfferedSlugs).toEqual(["identity"]);
    expect(patch.acceleratedSlugs).toContain("body");
    expect(patch.acceleratedSlugs.length).toBeGreaterThan(1);
    expect(patch.onboardingDataPatch.significant_shift_flag).toBe("no");
    expect(patch.onboardingDataPatch.significant_life_event_flag).toBe(false);
    expect(patch.onboardingDataPatch.significantLifeEventFlag).toBe(false);
    expect(patch.moduleSchedules.identity?.refreshReason).toBe("reassessment_90d");
  });

  it("maps life events to module slugs", () => {
    expect(mapLifeEventToModuleSlugs("loss_or_grief")).toEqual(["history", "meaning"]);
  });

  it("builds life event patch for completed and locked slugs", () => {
    const patch = buildLifeEventModuleRefreshPatch(
      {
        moduleHistoryComplete: true,
        moduleSchedules: readModuleSchedules({
          history: {
            scheduledAt: "2026-07-17T00:00:00.000Z",
            unlockedAt: "2026-07-17T00:00:00.000Z",
            completedAt: "2026-07-20T00:00:00.000Z",
          },
          meaning: {
            scheduledAt: "2026-12-01T00:00:00.000Z",
            unlockedAt: null,
            completedAt: null,
          },
        }),
      },
      "loss_or_grief",
      NOW,
    );

    expect(patch.refreshOfferedSlugs).toEqual(["history"]);
    expect(patch.acceleratedSlugs).toEqual(["meaning"]);
    expect(patch.onboardingDataPatch.last_life_event_type).toBe("loss_or_grief");
    expect(patch.onboardingDataPatch.significant_life_event_flag).toBe(true);
    expect(patch.onboardingDataPatch.significantLifeEventFlag).toBe(true);
  });

  it("builds user-initiated refresh only for completed slugs", () => {
    const patch = buildUserInitiatedRefreshPatch(
      {
        moduleIdentityComplete: true,
        moduleSchedules: {
          identity: {
            scheduledAt: "2026-07-17T00:00:00.000Z",
            unlockedAt: "2026-07-17T00:00:00.000Z",
            completedAt: "2026-07-20T00:00:00.000Z",
          },
        },
      },
      ["identity", "body"],
      NOW,
    );

    expect(patch.refreshOfferedSlugs).toEqual(["identity"]);
  });
});
