import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResultsData } from "@/lib/classification";

import { buildReassessmentModuleRefreshPatch } from "@/lib/modules/moduleRefresh";

const mockPipeline = vi.fn().mockResolvedValue(undefined);
const mockLoadProfile = vi.fn();
const mockAutoEnroll = vi.fn().mockResolvedValue([]);
const mockInsert = vi.fn().mockResolvedValue({ id: "assessment-1" });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({ data: { onboardingData: {} }, error: null }),
  }),
});

vi.mock("@/lib/userProfile/onboardingProfilePipeline", () => ({
  runOnboardingProfilePipeline: (...args: unknown[]) => mockPipeline(...args),
}));

vi.mock("@/lib/paths/pathsOnboardingEnrollmentApi", () => ({
  autoEnrollPathsAfterOnboarding: (...args: unknown[]) => mockAutoEnroll(...args),
}));

vi.mock("@/lib/reassessment/assessmentResultApi", () => ({
  insertAssessmentResult: (...args: unknown[]) => mockInsert(...args),
}));

vi.mock("@/lib/reassessment/recommendPathsAfterReassessment", () => ({
  readCoachingModeFromOnboarding: () => null,
  recommendPathsAfterReassessment: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/modules/completeModule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/modules/completeModule")>();
  return {
    ...actual,
    loadModuleProfileForCompletion: (...args: unknown[]) => mockLoadProfile(...args),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: (...args: unknown[]) => mockUpdate(...args),
      select: (...args: unknown[]) => mockSelect(...args),
    })),
  },
}));

const BASE_RESULTS = {
  classification: { key: "capacity_erosion", name: "Capacity Erosion" },
  stability_score: 3.5,
  performance_score: 3.5,
  alignment_score: 3.5,
  orientation_score: 3.5,
  recovery_mode_active: false,
  grief_mode_active: false,
} as ResultsData;

describe("completeReassessment module refresh hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadProfile.mockResolvedValue({
      moduleIdentityComplete: true,
      moduleSchedules: {
        identity: {
          scheduledAt: "2026-07-17T00:00:00.000Z",
          unlockedAt: "2026-07-17T00:00:00.000Z",
          completedAt: "2026-07-20T00:00:00.000Z",
        },
      },
      onboardingData: {},
    });
  });

  it("offers module refresh after reassessment completes", async () => {
    const { completeReassessment } = await import("@/lib/reassessment/completeReassessment");

    const result = await completeReassessment({
      userId: "user-1",
      tier: "pro",
      firstResults: BASE_RESULTS,
      secondResults: BASE_RESULTS,
      reflections: {},
      reassessmentData: {},
      primaryPillar: "professional",
    });

    expect(result.modulesRefreshOffered).toEqual(["identity"]);
    expect(result.modulesAcceleratedUnlock).toEqual(
      expect.arrayContaining(["body", "relational"]),
    );
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("buildReassessmentModuleRefreshPatch sets significant shift flag", () => {
    const patch = buildReassessmentModuleRefreshPatch(
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
      BASE_RESULTS,
      {
        ...BASE_RESULTS,
        performance_score: 2.0,
      },
      new Date("2026-10-15T12:00:00.000Z"),
    );

    expect(patch.onboardingDataPatch.significant_shift_flag).toBe("yes");
    expect(patch.refreshOfferedSlugs).toContain("identity");
  });
});
