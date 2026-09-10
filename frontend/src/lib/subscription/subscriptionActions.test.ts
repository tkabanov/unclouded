/**
 * MOB-06 — native build ships no purchase/plan-change flow. Web behavior is
 * covered exhaustively by `subscriptionAcceptanceCriteria.test.ts`'s AC-1/AC-3/
 * AC-8/AC-25/AC-27 (unmodified, still exercising `isNativeApp() === false`);
 * this file adds the native-mode filter and its `resolvePlanCardState` effects.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import { TIER } from "@/lib/enums/tier";
import { NATIVE_MANAGE_PLAN_ON_WEB_MESSAGE } from "@/lib/subscription/subscriptionCopy";
import {
  resolveAllowedActions,
  resolvePlanCardState,
} from "@/lib/subscription/subscriptionActions";
import { FREE_SUBSCRIPTION_RECORD, type SubscriptionRecord } from "@/lib/subscription/subscriptionState";

const mockIsNativeApp = vi.mocked(isNativeApp);

const NOW = Date.UTC(2026, 6, 27);
const DAY = 24 * 60 * 60 * 1000;

function record(overrides: Partial<SubscriptionRecord>): SubscriptionRecord {
  return { ...FREE_SUBSCRIPTION_RECORD, ...overrides };
}

const activePro = record({
  planTier: TIER.PRO,
  status: "active",
  billingInterval: "month",
  currentPeriodEnd: new Date(NOW + 20 * DAY).toISOString(),
  hasPaymentMethodOnFile: true,
  hasStripeSubscription: true,
});

const activePremium = record({
  planTier: TIER.PREMIUM,
  status: "active",
  billingInterval: "month",
  currentPeriodEnd: new Date(NOW + 20 * DAY).toISOString(),
  hasPaymentMethodOnFile: true,
  hasStripeSubscription: true,
});

describe("resolveAllowedActions (native)", () => {
  afterEach(() => {
    mockIsNativeApp.mockReturnValue(false);
  });

  it("drops startCheckout for a free/no-record user", () => {
    mockIsNativeApp.mockReturnValue(true);
    expect(resolveAllowedActions({ record: null }, NOW)).not.toContain("startCheckout");
    expect(resolveAllowedActions({ record: null }, NOW)).toEqual([]);
  });

  it("drops upgradeToPremium and startCheckout for an active Pro user, keeps cancel", () => {
    mockIsNativeApp.mockReturnValue(true);
    const actions = resolveAllowedActions({ record: activePro }, NOW);
    expect(actions).not.toContain("upgradeToPremium");
    expect(actions).not.toContain("startCheckout");
    expect(actions).toContain("cancel");
  });

  it("drops scheduleDowngrade for an active Premium user, keeps cancel", () => {
    mockIsNativeApp.mockReturnValue(true);
    const actions = resolveAllowedActions({ record: activePremium }, NOW);
    expect(actions).not.toContain("scheduleDowngrade");
    expect(actions).toContain("cancel");
  });

  it("keeps resume, cancelDowngrade and updatePaymentMethod on native", () => {
    mockIsNativeApp.mockReturnValue(true);
    const scheduledToCancel = record({ ...activePro, status: "scheduledToCancel" });
    const scheduledToCancelActions = resolveAllowedActions({ record: scheduledToCancel }, NOW);
    expect(scheduledToCancelActions).toContain("resume");
    expect(scheduledToCancelActions).not.toContain("upgradeToPremium");

    const scheduledToDowngrade = record({
      ...activePremium,
      status: "scheduledToDowngrade",
    });
    expect(resolveAllowedActions({ record: scheduledToDowngrade }, NOW)).toContain(
      "cancelDowngrade",
    );

    expect(resolveAllowedActions({ record: activePro }, NOW)).toContain("updatePaymentMethod");
  });

  it("enterprise still returns no self-serve billing actions on native", () => {
    mockIsNativeApp.mockReturnValue(true);
    expect(resolveAllowedActions({ record: activePro, accountType: "enterprise" }, NOW)).toEqual(
      [],
    );
  });

  it("output is unchanged from the web snapshot when not native", () => {
    mockIsNativeApp.mockReturnValue(false);
    expect(resolveAllowedActions({ record: activePro }, NOW)).toContain("upgradeToPremium");
    expect(resolveAllowedActions({ record: activePremium }, NOW)).toContain("scheduleDowngrade");
    expect(resolveAllowedActions({ record: null }, NOW)).toContain("startCheckout");
  });
});

describe("resolvePlanCardState (native)", () => {
  afterEach(() => {
    mockIsNativeApp.mockReturnValue(false);
  });

  it("shows webOnly instead of upgrade for a Free user viewing a paid card", () => {
    mockIsNativeApp.mockReturnValue(true);
    const state = resolvePlanCardState({ cardTier: TIER.PRO, record: null, nowMs: NOW });
    expect(state.primary).toEqual({ kind: "webOnly", label: NATIVE_MANAGE_PLAN_ON_WEB_MESSAGE });
  });

  it("shows webOnly instead of upgradeToPremium for an active Pro user viewing Premium", () => {
    mockIsNativeApp.mockReturnValue(true);
    const state = resolvePlanCardState({ cardTier: TIER.PREMIUM, record: activePro, nowMs: NOW });
    expect(state.primary).toEqual({ kind: "webOnly", label: NATIVE_MANAGE_PLAN_ON_WEB_MESSAGE });
  });

  it("shows webOnly instead of downgradeToPro for an active Premium user viewing Pro", () => {
    mockIsNativeApp.mockReturnValue(true);
    const state = resolvePlanCardState({ cardTier: TIER.PRO, record: activePremium, nowMs: NOW });
    expect(state.primary).toEqual({ kind: "webOnly", label: NATIVE_MANAGE_PLAN_ON_WEB_MESSAGE });
  });

  it("still shows cancel on the current active Pro card (not a purchase action)", () => {
    mockIsNativeApp.mockReturnValue(true);
    const state = resolvePlanCardState({ cardTier: TIER.PRO, record: activePro, nowMs: NOW });
    expect(state.primary).toEqual({ kind: "cancel", label: "Cancel subscription" });
  });

  it("matches today's web snapshot when not native", () => {
    mockIsNativeApp.mockReturnValue(false);
    expect(
      resolvePlanCardState({ cardTier: TIER.PRO, record: null, nowMs: NOW }).primary,
    ).toEqual({ kind: "upgrade", targetTier: TIER.PRO, label: "Upgrade to Pro" });
    expect(
      resolvePlanCardState({ cardTier: TIER.PREMIUM, record: activePro, nowMs: NOW }).primary,
    ).toEqual({ kind: "upgradeToPremium", label: "Upgrade to Premium" });
    expect(
      resolvePlanCardState({ cardTier: TIER.PRO, record: activePremium, nowMs: NOW }).primary,
    ).toEqual({ kind: "downgradeToPro", label: "Downgrade to Pro" });
  });
});
