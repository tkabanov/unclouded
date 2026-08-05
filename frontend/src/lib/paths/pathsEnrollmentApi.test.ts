import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PathEnrollmentPurchaseRequiredError,
  PathEnrollmentUpgradeRequiredError,
  enrollInPath,
} from "./pathsEnrollmentApi";

const fetchPathCatalogEntry = vi.fn();
const fetchPathSessionsByKey = vi.fn();
const createPathEnrollmentRow = vi.fn();
const loadEffectiveTierForUser = vi.fn();
const loadSubscriptionOverview = vi.fn();
const rpc = vi.fn();

const pathEnrollmentChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "pathEnrollment") return pathEnrollmentChain;
      return {
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    }),
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

vi.mock("@/lib/paths/pathsCatalogApi", () => ({
  fetchPathCatalogEntry: (...args: unknown[]) => fetchPathCatalogEntry(...args),
  fetchPathSessionsByKey: (...args: unknown[]) => fetchPathSessionsByKey(...args),
}));

vi.mock("@/lib/paths/pathsOnboardingEnrollmentApi", () => ({
  createPathEnrollmentRow: (...args: unknown[]) => createPathEnrollmentRow(...args),
}));

vi.mock("@/lib/subscription/subscriptionApi", () => ({
  loadEffectiveTierForUser: (...args: unknown[]) => loadEffectiveTierForUser(...args),
  loadSubscriptionOverview: (...args: unknown[]) => loadSubscriptionOverview(...args),
}));

describe("enrollInPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadEffectiveTierForUser.mockResolvedValue("pro");
    createPathEnrollmentRow.mockResolvedValue("enrollment-id");
    fetchPathSessionsByKey.mockResolvedValue([]);
    rpc.mockResolvedValue({ data: false, error: null });
    loadSubscriptionOverview.mockResolvedValue({
      successPlanAddon: { active: false },
    });
  });

  it("rejects enrollment when the user tier is below the path tier", async () => {
    loadEffectiveTierForUser.mockResolvedValue("free");
    fetchPathCatalogEntry.mockResolvedValue({
      id: "path-id",
      slug: "breaking-out-of-the-comfortable-plateau",
      tier: "pro",
      triggerSignals: "enrollment:onboarding",
    });

    await expect(
      enrollInPath("user-id", "breaking-out-of-the-comfortable-plateau", {}),
    ).rejects.toBeInstanceOf(PathEnrollmentUpgradeRequiredError);

    expect(createPathEnrollmentRow).not.toHaveBeenCalled();
  });

  it("rejects enrollment when module prerequisites are not met", async () => {
    fetchPathCatalogEntry.mockResolvedValue({
      id: "path-id",
      slug: "understanding-your-emotional-patterns",
      tier: "pro",
      triggerSignals: "enrollment:onboarding; prerequisite:module:identity",
    });

    await expect(
      enrollInPath("user-id", "understanding-your-emotional-patterns", {}, {
        moduleIdentityComplete: false,
      }),
    ).rejects.toThrow("Complete Identity Lens to unlock this path");

    expect(createPathEnrollmentRow).not.toHaveBeenCalled();
  });

  it("allows enrollment when module prerequisites are met", async () => {
    fetchPathCatalogEntry.mockResolvedValue({
      id: "path-id",
      slug: "understanding-your-emotional-patterns",
      tier: "pro",
      triggerSignals: "enrollment:onboarding; prerequisite:module:identity",
    });

    await enrollInPath("user-id", "understanding-your-emotional-patterns", {}, {
      moduleIdentityComplete: true,
    });

    expect(createPathEnrollmentRow).toHaveBeenCalledWith("user-id", "path-id", {
      setAsPrimary: true,
      source: "self",
    });
  });

  it("rejects Free self-enroll into Success Plans", async () => {
    loadEffectiveTierForUser.mockResolvedValue("free");
    fetchPathCatalogEntry.mockResolvedValue({
      id: "sp-id",
      slug: "new-manager-success-plan",
      tier: "pro",
      subMode: "success_plan",
      triggerSignals: "path_type:success_plan",
    });

    await expect(
      enrollInPath("user-id", "new-manager-success-plan", {}),
    ).rejects.toBeInstanceOf(PathEnrollmentUpgradeRequiredError);

    expect(createPathEnrollmentRow).not.toHaveBeenCalled();
  });

  it("rejects Pro Success Plan enroll without add-on", async () => {
    loadEffectiveTierForUser.mockResolvedValue("pro");
    rpc.mockResolvedValue({ data: false, error: null });
    fetchPathCatalogEntry.mockResolvedValue({
      id: "sp-id",
      slug: "new-manager-success-plan",
      tier: "pro",
      subMode: "success_plan",
      triggerSignals: "path_type:success_plan",
    });

    await expect(
      enrollInPath("user-id", "new-manager-success-plan", {}),
    ).rejects.toBeInstanceOf(PathEnrollmentPurchaseRequiredError);

    expect(createPathEnrollmentRow).not.toHaveBeenCalled();
  });

  it("allows Pro Success Plan enroll with add-on", async () => {
    loadEffectiveTierForUser.mockResolvedValue("pro");
    rpc.mockResolvedValue({ data: true, error: null });
    fetchPathCatalogEntry.mockResolvedValue({
      id: "sp-id",
      slug: "new-manager-success-plan",
      tier: "pro",
      subMode: "success_plan",
      triggerSignals: "path_type:success_plan",
    });

    await enrollInPath("user-id", "new-manager-success-plan", {});

    expect(createPathEnrollmentRow).toHaveBeenCalledWith("user-id", "sp-id", {
      setAsPrimary: true,
      source: "addon",
    });
  });
});
