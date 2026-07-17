import { describe, expect, it, vi, beforeEach } from "vitest";

import { AI_CONFIDENCE_LEVEL } from "@/lib/enums/coachingMode";

import {
  buildModuleCompletionPatch,
  buildModuleRefreshPatch,
  coerceModuleFieldForDb,
  toProfileUpdatePayload,
  toRefreshProfileUpdatePayload,
} from "./moduleProfilePatch";
import {
  mapAnswersToProfileFields,
  resolveModuleSideEffects,
} from "./moduleConfigApi";
import { resolveSideEffectsForModule } from "./moduleSideEffects";
import {
  completeModule,
  ModuleAlreadyCompleteError,
} from "./completeModule";

const mockInvoke = vi.fn().mockResolvedValue({ data: null, error: null });
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

const IDENTITY_ANSWERS = {
  iq1: "performance_based",
  iq2: "growth",
  iq3: "3",
  iq4: "self_set",
};

const HISTORY_ACTIVE_ANSWERS = {
  hq1: "active",
  hq2: "moderate",
  hq3: ["major_loss"],
  hq4: "therapy",
};

describe("coerceModuleFieldForDb", () => {
  it("parses identity role fusion slug to integer", () => {
    expect(coerceModuleFieldForDb("identityRoleFusionScore", "3")).toBe(3);
  });

  it("maps chronic pain slug to boolean with slug preserved via onboarding path", () => {
    expect(coerceModuleFieldForDb("chronicPainFlag", "yes_significant")).toBe(true);
    expect(coerceModuleFieldForDb("chronicPainFlag", "no")).toBe(false);
  });

  it("preserves significantEvents12mo array for history multi-select", () => {
    const events = ["major_loss", "health_event"];
    expect(coerceModuleFieldForDb("significantEvents12mo", events)).toEqual(events);
  });
});

describe("buildModuleCompletionPatch", () => {
  const baseProfile = {
    modulesCompletedCount: 0,
    onboardingData: {},
    results: { trauma_informed_mode: false },
    moduleSchedules: {
      identity: {
        scheduledAt: "2026-07-17T00:00:00.000Z",
        unlockedAt: null,
        completedAt: null,
      },
    },
  };

  it("builds identity patch with answer fields, complete flag, and count increment", () => {
    const mapped = mapAnswersToProfileFields("identity", IDENTITY_ANSWERS);
    const sideEffects = resolveSideEffectsForModule("identity", mapped);

    const patch = buildModuleCompletionPatch({
      slug: "identity",
      mappedAnswers: mapped,
      sideEffects,
      profile: baseProfile,
      completedAt: "2026-07-20T12:00:00.000Z",
    });

    expect(patch.profileColumns.moduleIdentityComplete).toBe(true);
    expect(patch.profileColumns.identitySelfWorthSource).toBe("performance_based");
    expect(patch.profileColumns.identityRoleFusionScore).toBe(3);
    expect(patch.modulesCompletedCount).toBe(1);
    expect(patch.onboardingData.module_identity_complete).toBe(true);
    expect(patch.onboardingData.identity_self_worth_source).toBe("performance_based");
    expect(patch.onboardingData.last_completed_module_slug).toBe("identity");
    expect(patch.onboardingData.last_completed_module_name).toBe("Identity Lens");
    expect(patch.onboardingData.last_completed_module_at).toBe("2026-07-20T12:00:00.000Z");
    expect(patch.moduleSchedules.identity?.completedAt).toBe("2026-07-20T12:00:00.000Z");
    expect(patch.results?.trauma_informed_mode).not.toBe(true);
  });

  it("builds refresh patch without incrementing completion count", () => {
    const mapped = mapAnswersToProfileFields("identity", IDENTITY_ANSWERS);
    const sideEffects = resolveSideEffectsForModule("identity", mapped);

    const patch = buildModuleRefreshPatch({
      slug: "identity",
      mappedAnswers: mapped,
      sideEffects,
      profile: {
        ...baseProfile,
        modulesCompletedCount: 2,
        moduleIdentityComplete: true,
        moduleSchedules: {
          identity: {
            scheduledAt: "2026-07-17T00:00:00.000Z",
            unlockedAt: "2026-07-17T00:00:00.000Z",
            completedAt: "2026-07-19T00:00:00.000Z",
            refreshOfferedAt: "2026-10-15T00:00:00.000Z",
            refreshReason: "reassessment_90d",
          },
        },
      },
      completedAt: "2026-10-16T12:00:00.000Z",
    });

    expect(patch.profileColumns.moduleIdentityComplete).toBeUndefined();
    expect(patch.profileColumns.identitySelfWorthSource).toBe("performance_based");
    expect(patch.moduleSchedules.identity?.refreshOfferedAt).toBeNull();
    expect(patch.moduleSchedules.identity?.completedAt).toBe("2026-10-16T12:00:00.000Z");
    expect(
      toRefreshProfileUpdatePayload(patch, {
        modulesCompletedCount: 2,
      }).modulesCompletedCount,
    ).toBe(2);
  });

  it("sets trauma_informed_mode when history trauma activation is active", () => {
    const mapped = mapAnswersToProfileFields("history", HISTORY_ACTIVE_ANSWERS);
    const sideEffects = resolveSideEffectsForModule("history", mapped);

    const patch = buildModuleCompletionPatch({
      slug: "history",
      mappedAnswers: mapped,
      sideEffects,
      profile: {
        ...baseProfile,
        moduleSchedules: {
          history: {
            scheduledAt: "2026-07-17T00:00:00.000Z",
            unlockedAt: null,
            completedAt: null,
          },
        },
      },
      completedAt: "2026-07-20T12:00:00.000Z",
    });

    expect(toProfileUpdatePayload(patch).results).toEqual(
      expect.objectContaining({ trauma_informed_mode: true }),
    );
  });

  it("preserves existing trauma_informed_mode when history is not active", () => {
    const mapped = mapAnswersToProfileFields("history", {
      hq1: "low",
      hq2: "moderate",
      hq3: ["none"],
      hq4: "none",
    });
    const sideEffects = resolveSideEffectsForModule("history", mapped);

    const patch = buildModuleCompletionPatch({
      slug: "history",
      mappedAnswers: mapped,
      sideEffects,
      profile: {
        ...baseProfile,
        results: { trauma_informed_mode: true },
        moduleSchedules: {
          history: {
            scheduledAt: "2026-07-17T00:00:00.000Z",
            unlockedAt: null,
            completedAt: null,
          },
        },
      },
      completedAt: "2026-07-20T12:00:00.000Z",
    });

    expect(patch.results?.trauma_informed_mode).toBe(true);
  });

  it("derives spiritualFrameworkPresent false for meaning when type is no", () => {
    const answers = {
      mq1: "clear",
      mq2: "no",
      mq3: "strong",
      mq4: "people",
    };
    const mapped = mapAnswersToProfileFields("meaning", answers);
    const sideEffects = resolveModuleSideEffects("meaning", answers);

    const patch = buildModuleCompletionPatch({
      slug: "meaning",
      mappedAnswers: mapped,
      sideEffects,
      profile: {
        ...baseProfile,
        moduleSchedules: {
          meaning: {
            scheduledAt: "2026-07-17T00:00:00.000Z",
            unlockedAt: null,
            completedAt: null,
          },
        },
      },
      completedAt: "2026-07-20T12:00:00.000Z",
    });

    expect(patch.profileColumns.spiritualFrameworkPresent).toBe(false);
  });

  it("derives hormonalContextFlag for body BQ3 yes answer", () => {
    const answers = {
      bq1: "good",
      bq2: "no",
      bq3: "yes_perimenopause",
      bq4: "connected",
      bq5: "none",
    };
    const mapped = mapAnswersToProfileFields("body", answers);
    const sideEffects = resolveModuleSideEffects("body", answers);

    const patch = buildModuleCompletionPatch({
      slug: "body",
      mappedAnswers: mapped,
      sideEffects,
      profile: {
        ...baseProfile,
        moduleSchedules: {
          body: {
            scheduledAt: "2026-07-17T00:00:00.000Z",
            unlockedAt: null,
            completedAt: null,
          },
        },
      },
      completedAt: "2026-07-20T12:00:00.000Z",
    });

    expect(patch.profileColumns.hormonalContextFlag).toBe(true);
    expect(patch.profileColumns.hormonalContextType).toBe("yes_perimenopause");
  });
});

describe("completeModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when module is already complete", async () => {
    mockSingle.mockResolvedValue({
      data: {
        modulesCompletedCount: 1,
        moduleIdentityComplete: true,
        moduleSchedules: {},
        onboardingData: {},
        results: {},
      },
      error: null,
    });

    await expect(
      completeModule("user-1", "identity", IDENTITY_ANSWERS),
    ).rejects.toBeInstanceOf(ModuleAlreadyCompleteError);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("persists identity completion patch", async () => {
    mockSingle.mockResolvedValue({
      data: {
        modulesCompletedCount: 0,
        moduleIdentityComplete: false,
        moduleSchedules: {
          identity: {
            scheduledAt: "2020-01-01T00:00:00.000Z",
            unlockedAt: null,
            completedAt: null,
          },
        },
        onboardingData: {},
        results: {},
      },
      error: null,
    });

    const result = await completeModule("user-1", "identity", IDENTITY_ANSWERS, {
      now: new Date("2026-07-20T12:00:00.000Z"),
    });

    expect(result.modulesCompletedCount).toBe(1);
    expect(result.aiConfidenceLevel).toBe(AI_CONFIDENCE_LEVEL.EXPLORATORY_PLUS);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleIdentityComplete: true,
        identitySelfWorthSource: "performance_based",
        identityRoleFusionScore: 3,
        modulesCompletedCount: 1,
      }),
    );
    expect(mockInvoke).toHaveBeenCalledWith("notification-milestone", {
      body: { milestone: "first_module_complete" },
    });
  });
});
