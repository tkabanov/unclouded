import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WebPushEnableBannerGate from "@/components/notifications/WebPushEnableBannerGate";

vi.mock("@/lib/userProfile", () => ({
  useUserProfile: vi.fn(),
}));

vi.mock("@/components/notifications/WebPushEnableBanner", () => ({
  default: () => <div data-testid="web-push-enable-banner">banner</div>,
}));

import { useUserProfile } from "@/lib/userProfile";

describe("WebPushEnableBannerGate", () => {
  it("renders for grief cohort even when profile has no id field", () => {
    vi.mocked(useUserProfile).mockReturnValue({
      profile: {
        firstName: "qwe",
        roleType: "individual",
        primaryPillar: "emotional",
        results: { grief_mode_active: true, recovery_mode_active: false } as never,
        onboardingCompleted: true,
        onboardingCompletedAt: null,
        onboardingData: null,
        subscribed: false,
        tier: null,
        lastAssessmentDate: null,
        nextReassessmentDate: null,
        canReassessOnDemand: false,
        reassessmentResults: null,
        reassessmentReflections: null,
        reassessmentCompletedAt: null,
      },
      loading: false,
    } as never);

    render(<WebPushEnableBannerGate />);
    expect(screen.getByTestId("web-push-enable-banner")).toBeInTheDocument();
  });

  it("does not render for non-vulnerable profiles", () => {
    vi.mocked(useUserProfile).mockReturnValue({
      profile: {
        firstName: "qwe",
        roleType: "individual",
        primaryPillar: "emotional",
        results: { grief_mode_active: false, recovery_mode_active: false } as never,
        onboardingCompleted: true,
        onboardingCompletedAt: null,
        onboardingData: null,
        subscribed: false,
        tier: null,
        lastAssessmentDate: null,
        nextReassessmentDate: null,
        canReassessOnDemand: false,
        reassessmentResults: null,
        reassessmentReflections: null,
        reassessmentCompletedAt: null,
      },
      loading: false,
    } as never);

    render(<WebPushEnableBannerGate />);
    expect(screen.queryByTestId("web-push-enable-banner")).not.toBeInTheDocument();
  });
});
