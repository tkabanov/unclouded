import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TIER } from "@/lib/enums/tier";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";
import {
  runSubscriptionAction,
  SUBSCRIPTION_ERROR_MESSAGES,
} from "@/lib/subscription/subscriptionApi";
import {
  FREE_SUBSCRIPTION_RECORD,
  type SubscriptionRecord,
} from "@/lib/subscription/subscriptionState";

vi.mock("@/lib/subscription/subscriptionApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/subscription/subscriptionApi")>();
  return {
    ...actual,
    runSubscriptionAction: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));

import { toast } from "sonner";

const activePro: SubscriptionRecord = {
  ...FREE_SUBSCRIPTION_RECORD,
  planTier: TIER.PRO,
  status: "active",
  billingInterval: "month",
  currentPeriodEnd: new Date(Date.UTC(2026, 7, 28)).toISOString(),
  hasPaymentMethodOnFile: true,
  hasStripeSubscription: true,
};

describe("useSubscriptionFlow cancel errors (SUB-CAN-ERR-001)", () => {
  beforeEach(() => {
    vi.mocked(runSubscriptionAction).mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
  });

  it("shows cancellation error copy and leaves overview unchanged when cancel fails", async () => {
    vi.mocked(runSubscriptionAction).mockRejectedValue(
      new Error(SUBSCRIPTION_ERROR_MESSAGES.cancel),
    );

    const applyOverview = vi.fn();
    const { result } = renderHook(() =>
      useSubscriptionFlow({
        record: activePro,
        interval: "month",
        applyOverview,
        onEntitlementChanged: vi.fn(),
      }),
    );

    act(() => {
      result.current.handlePlanCardAction({ kind: "cancel" });
    });

    await act(async () => {
      result.current.confirmDialog();
    });

    expect(runSubscriptionAction).toHaveBeenCalledWith(
      "cancel",
      SUBSCRIPTION_ERROR_MESSAGES.cancel,
    );
    expect(toast.error).toHaveBeenCalledWith(SUBSCRIPTION_ERROR_MESSAGES.cancel);
    expect(toast.success).not.toHaveBeenCalled();
    expect(applyOverview).not.toHaveBeenCalled();
  });
});
