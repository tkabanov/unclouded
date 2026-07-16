import { describe, expect, it } from "vitest";
import { resolveHealthModeFlags } from "./healthModeFlags";

describe("resolveHealthModeFlags", () => {
  it("returns all false when profile is missing", () => {
    expect(resolveHealthModeFlags(null)).toEqual({
      recoveryModeActive: false,
      griefModeActive: false,
      traumaInformedMode: false,
    });
  });

  it("reads recovery and grief from results", () => {
    expect(
      resolveHealthModeFlags({
        results: {
          recovery_mode_active: true,
          grief_mode_active: false,
          trauma_informed_mode: true,
        },
      }),
    ).toEqual({
      recoveryModeActive: true,
      griefModeActive: false,
      traumaInformedMode: true,
    });
  });

  it("falls back to onboarding healthFlags when results are absent", () => {
    expect(
      resolveHealthModeFlags({
        onboardingData: {
          healthFlags: {
            recovery_mode_active: false,
            grief_mode_active: true,
          },
        },
      }),
    ).toEqual({
      recoveryModeActive: false,
      griefModeActive: true,
      traumaInformedMode: false,
    });
  });

  it("treats either source as active when flags disagree (defensive OR)", () => {
    expect(
      resolveHealthModeFlags({
        onboardingData: {
          healthFlags: { recovery_mode_active: true, grief_mode_active: false },
        },
        results: { recovery_mode_active: false, grief_mode_active: true },
      }),
    ).toEqual({
      recoveryModeActive: true,
      griefModeActive: true,
      traumaInformedMode: false,
    });
  });
});
