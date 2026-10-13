import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMyReferralCoachCredits } from "@/lib/referrals/referralCoachCreditsApi";

const callRpc = vi.fn();

vi.mock("@/lib/supabase/rpc", () => ({
  callRpc: (...args: unknown[]) => callRpc(...args),
}));

describe("fetchMyReferralCoachCredits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the balance from the RPC", async () => {
    callRpc.mockResolvedValue({ data: 2, error: null });
    await expect(fetchMyReferralCoachCredits()).resolves.toBe(2);
    expect(callRpc).toHaveBeenCalledWith("my_referral_coach_credit_balance");
  });

  it("falls back to 0 when the RPC fails or returns junk", async () => {
    callRpc.mockResolvedValueOnce({ data: null, error: { message: "function does not exist" } });
    await expect(fetchMyReferralCoachCredits()).resolves.toBe(0);

    callRpc.mockResolvedValueOnce({ data: "abc", error: null });
    await expect(fetchMyReferralCoachCredits()).resolves.toBe(0);

    callRpc.mockResolvedValueOnce({ data: -3, error: null });
    await expect(fetchMyReferralCoachCredits()).resolves.toBe(0);
  });
});
