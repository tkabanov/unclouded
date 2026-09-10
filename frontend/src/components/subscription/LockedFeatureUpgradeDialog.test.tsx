import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

vi.mock("@/lib/subscription/subscriptionApi", () => ({
  loadSubscriptionOverview: vi.fn().mockResolvedValue({ prices: [] }),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import { TIER } from "@/lib/enums/tier";
import LockedFeatureUpgradeDialog from "@/components/subscription/LockedFeatureUpgradeDialog";
import { NATIVE_MANAGE_PLAN_ON_WEB_MESSAGE } from "@/lib/subscription/subscriptionCopy";

const mockIsNativeApp = vi.mocked(isNativeApp);

describe("LockedFeatureUpgradeDialog (MOB-06)", () => {
  it("web: offers a checkout-bound CTA", () => {
    mockIsNativeApp.mockReturnValue(false);
    render(
      <MemoryRouter>
        <LockedFeatureUpgradeDialog
          open
          feature="oneOnOneSession"
          currentTier={TIER.FREE}
          onClose={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /upgrade to premium/i })).toBeInTheDocument();
    expect(screen.queryByText(NATIVE_MANAGE_PLAN_ON_WEB_MESSAGE)).not.toBeInTheDocument();
  });

  it("native: shows plain-text web-management copy, no purchase CTA", () => {
    mockIsNativeApp.mockReturnValue(true);
    render(
      <MemoryRouter>
        <LockedFeatureUpgradeDialog
          open
          feature="oneOnOneSession"
          currentTier={TIER.FREE}
          onClose={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(NATIVE_MANAGE_PLAN_ON_WEB_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /upgrade to premium/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /see plans/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
  });
});
