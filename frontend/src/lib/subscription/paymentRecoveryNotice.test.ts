import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  clearPaymentRecoveryPending,
  isPaymentRecoveryPending,
  isRecoveredSubscriptionStatus,
  markPaymentRecoveryPending,
} from "@/lib/subscription/paymentRecoveryNotice";

describe("paymentRecoveryNotice", () => {
  beforeEach(() => {
    clearPaymentRecoveryPending();
  });

  afterEach(() => {
    clearPaymentRecoveryPending();
  });

  it("tracks the portal recovery pending flag in sessionStorage", () => {
    expect(isPaymentRecoveryPending()).toBe(false);
    markPaymentRecoveryPending();
    expect(isPaymentRecoveryPending()).toBe(true);
    clearPaymentRecoveryPending();
    expect(isPaymentRecoveryPending()).toBe(false);
  });

  it("recognizes recovered subscription statuses", () => {
    expect(isRecoveredSubscriptionStatus("active")).toBe(true);
    expect(isRecoveredSubscriptionStatus("scheduledToCancel")).toBe(true);
    expect(isRecoveredSubscriptionStatus("scheduledToDowngrade")).toBe(true);
    expect(isRecoveredSubscriptionStatus("pastDue")).toBe(false);
    expect(isRecoveredSubscriptionStatus("inactive")).toBe(false);
    expect(isRecoveredSubscriptionStatus(null)).toBe(false);
  });

  it("swallows sessionStorage failures", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => markPaymentRecoveryPending()).not.toThrow();
    expect(isPaymentRecoveryPending()).toBe(false);
    expect(() => clearPaymentRecoveryPending()).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
    removeItem.mockRestore();
  });
});
