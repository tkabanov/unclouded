import { describe, expect, it } from "vitest";

import { ONBOARDING_STEP } from "@/lib/enums/onboardingSteps";
import { resumeStepAfterWorkplaceCodeGate } from "@/lib/onboardingProgress";

describe("resumeStepAfterWorkplaceCodeGate", () => {
  it("leaves non-code resume steps unchanged", () => {
    expect(
      resumeStepAfterWorkplaceCodeGate(ONBOARDING_STEP.WELCOME, {
        workplaceCodeSkipped: true,
        accountType: "enterprise",
      }),
    ).toBe(ONBOARDING_STEP.WELCOME);
    expect(
      resumeStepAfterWorkplaceCodeGate(ONBOARDING_STEP.NAME, { accountType: "enterprise" }),
    ).toBe(ONBOARDING_STEP.NAME);
  });

  it("keeps the workplace code step for individuals who have not skipped", () => {
    expect(
      resumeStepAfterWorkplaceCodeGate(ONBOARDING_STEP.WORKPLACE_CODE, {
        workplaceCodeSkipped: false,
        accountType: "individual",
      }),
    ).toBe(ONBOARDING_STEP.WORKPLACE_CODE);
  });

  it("advances past workplace code after skip or enterprise redeem", () => {
    expect(
      resumeStepAfterWorkplaceCodeGate(ONBOARDING_STEP.WORKPLACE_CODE, {
        workplaceCodeSkipped: true,
        accountType: "individual",
      }),
    ).toBe(ONBOARDING_STEP.NAME);
    expect(
      resumeStepAfterWorkplaceCodeGate(ONBOARDING_STEP.WORKPLACE_CODE, {
        workplaceCodeSkipped: false,
        accountType: "enterprise",
      }),
    ).toBe(ONBOARDING_STEP.NAME);
  });
});
