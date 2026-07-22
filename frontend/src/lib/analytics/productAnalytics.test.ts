import { beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
const identify = vi.fn();
const reset = vi.fn();
const init = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init,
    capture,
    identify,
    reset,
  },
}));

describe("productAnalytics", () => {
  beforeEach(() => {
    vi.resetModules();
    capture.mockReset();
    identify.mockReset();
    reset.mockReset();
    init.mockReset();
    vi.unstubAllEnvs();
  });

  it("noops when PostHog key is missing", async () => {
    const analytics = await import("./productAnalytics");
    analytics.resetProductAnalyticsForTests();

    analytics.initProductAnalytics();
    analytics.trackProductEvent("signup_completed");
    analytics.identifyUser("user-1");
    analytics.resetUser();

    expect(init).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it("initializes and tracks when PostHog key is set", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_test_key");
    const analytics = await import("./productAnalytics");
    analytics.resetProductAnalyticsForTests();

    analytics.initProductAnalytics();
    analytics.trackProductEvent("onboarding_started", { step: "welcome" });
    analytics.identifyUser("user-1", { tier: "free", signupPlan: "founding" });
    analytics.resetUser();

    expect(init).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({ api_host: "https://us.i.posthog.com" }),
    );
    expect(capture).toHaveBeenCalledWith("onboarding_started", { step: "welcome" });
    expect(identify).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ tier: "free", signup_plan: "founding" }),
    );
    expect(reset).toHaveBeenCalled();
  });

  it("documents the marketing funnel steps", async () => {
    const analytics = await import("./productAnalytics");
    expect(analytics.PRODUCT_FUNNEL_STEPS).toEqual([
      "signup_completed",
      "onboarding_started",
      "onboarding_completed",
      "plan_upgrade_clicked",
      "free_to_pro_conversion",
    ]);
  });
});
