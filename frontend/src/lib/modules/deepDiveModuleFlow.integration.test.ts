import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "../../../../supabase/functions/chat/buildSystemPrompt.ts";
import {
  mapAnswersToProfileFields,
  resolveModuleSideEffects,
} from "./moduleConfigApi";
import { buildModuleCompletionPatch } from "./moduleProfilePatch";
import { computeOnboardingModulePreview, getModuleAvailability } from "./moduleScheduler";
import type { ModuleSchedulerInput } from "./moduleSchedulerTypes";
import type { ModuleProfileInput } from "./readModuleProfile";

const ANCHOR = new Date("2026-07-17T12:00:00.000Z");

const SCHEDULER_INPUT: ModuleSchedulerInput = {
  stabilityScores: { stability_score: 3.5 },
  performanceScores: { performance_score: 3.5 },
  alignmentScores: { alignment_score: 3.5 },
  loadSignals: {
    cognitive_load_signal: "mind_feels_clear_most_of_the_time",
    relational_load_signal: "relationships_feel_mostly_supportive",
    environmental_load_signal: "life_feels_mostly_manageable",
    financial_load_signal: "financial_situation_feels_stable",
  },
  stateSignals: {
    nervous_system_state: "regulated",
    energy_level_signal: "strong",
  },
  behavioralPatterns: {
    pressure_response_pattern: "push_through",
  },
  healthFlags: { grief_mode_active: false },
};

const BODY_ANSWERS = {
  bq1: "good",
  bq2: "no",
  bq3: "no",
  bq4: "connected",
  bq5: "none",
};

describe("deep-dive module flow integration", () => {
  it("chains onboarding schedule → unlock → complete → AI prompt change", () => {
    const { schedules, preview } = computeOnboardingModulePreview(SCHEDULER_INPUT, ANCHOR);
    expect(preview.slug).toBe("body");
    expect(Object.keys(schedules)).toHaveLength(6);

    const profileBeforeComplete: ModuleProfileInput = {
      modulesCompletedCount: 0,
      moduleSchedules: schedules,
      onboardingData: {
        modules_completed_count_number: 0,
        behavioralFingerprint: "Driver / Depletion Risk",
        loadSignals: SCHEDULER_INPUT.loadSignals,
        stateSignals: SCHEDULER_INPUT.stateSignals,
      },
      results: {
        stability_score: 3.5,
        performance_score: 3.5,
        alignment_score: 3.5,
        classification: { key: "optimization_ready", name: "Optimization Ready" },
        trauma_informed_mode: false,
        grief_mode_active: false,
        recovery_mode_active: false,
      },
    };

    const lockedAtAnchor = getModuleAvailability(profileBeforeComplete, ANCHOR);
    expect(lockedAtAnchor.body.status).toBe("locked");
    expect(lockedAtAnchor.body.daysUntilUnlock).toBeGreaterThan(0);

    const unlockDate = new Date(ANCHOR);
    unlockDate.setDate(unlockDate.getDate() + preview.daysUntilUnlock);
    const availableAfterUnlock = getModuleAvailability(profileBeforeComplete, unlockDate);
    expect(availableAfterUnlock.body.status).toBe("available");

    const completedAt = unlockDate.toISOString();
    const mapped = mapAnswersToProfileFields("body", BODY_ANSWERS);
    const sideEffects = resolveModuleSideEffects("body", BODY_ANSWERS);
    const patch = buildModuleCompletionPatch({
      slug: "body",
      mappedAnswers: mapped,
      sideEffects,
      profile: profileBeforeComplete,
      completedAt,
    });

    expect(patch.modulesCompletedCount).toBe(1);
    expect(patch.profileColumns.moduleBodyComplete).toBe(true);

    const promptBefore = buildSystemPrompt({
      firstName: "Sam",
      roleType: "founder",
      primaryPillar: "stability",
      results: profileBeforeComplete.results as Record<string, unknown>,
      onboardingData: profileBeforeComplete.onboardingData as Record<string, unknown>,
      moduleProfile: {
        modulesCompletedCount: 0,
        moduleBodyComplete: false,
      },
    });

    const promptAfter = buildSystemPrompt({
      firstName: "Sam",
      roleType: "founder",
      primaryPillar: "stability",
      results: profileBeforeComplete.results as Record<string, unknown>,
      onboardingData: patch.onboardingData,
      moduleProfile: {
        modulesCompletedCount: patch.modulesCompletedCount,
        moduleBodyComplete: true,
        sleepQualitySignal: patch.profileColumns.sleepQualitySignal as string,
        chronicPainFlag: patch.profileColumns.chronicPainFlag as boolean,
        bodyRelationship: patch.profileColumns.bodyRelationship as string,
        substancePatternSignal: patch.profileColumns.substancePatternSignal as string,
      },
    });

    expect(promptBefore).toContain("AI confidence level: exploratory (0 modules complete)");
    expect(promptBefore).not.toContain("Module complete — Body's Story");
    expect(promptAfter).toContain("Module complete — Body's Story");
    expect(promptAfter).toContain("AI confidence level: exploratory+ (1–2 modules complete)");
    expect(promptAfter).toContain("sleep_quality_signal=good");
    expect(promptAfter.length).toBeGreaterThan(promptBefore.length);
  });
});
