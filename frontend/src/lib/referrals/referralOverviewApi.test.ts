import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMyReferralOverview, mapReferralOverview } from "@/lib/referrals/referralOverviewApi";

const callRpc = vi.fn();

vi.mock("@/lib/supabase/rpc", () => ({
  callRpc: (...args: unknown[]) => callRpc(...args),
}));

describe("mapReferralOverview", () => {
  it("maps the RPC payload", () => {
    const overview = mapReferralOverview({
      code: "abcd2345",
      totalInvited: 2,
      invitees: [
        { displayName: "Anna S.", joinedAt: "2026-10-01T00:00:00Z", status: "rewarded", rewardedAt: "2026-10-05T00:00:00Z" },
        { displayName: "", joinedAt: null, status: "pending_confirmation", rewardedAt: null },
      ],
      credits: { earned: 1, used: 1, takenBack: 0, adjusted: 0, available: 0 },
      history: [
        { id: "l1", reason: "redemption", delta: -1, createdAt: "2026-10-06T00:00:00Z", friendName: null, sessionAt: "2026-10-09T10:00:00Z" },
      ],
    });

    expect(overview.code).toBe("ABCD2345");
    expect(overview.invitees).toEqual([
      { displayName: "Anna S.", joinedAt: "2026-10-01T00:00:00Z", status: "rewarded", rewardedAt: "2026-10-05T00:00:00Z" },
      { displayName: "Friend", joinedAt: null, status: "pending_confirmation", rewardedAt: null },
    ]);
    expect(overview.credits.available).toBe(0);
    expect(overview.history[0]).toMatchObject({ reason: "redemption", delta: -1 });
  });

  it("drops malformed rows and tolerates an empty payload", () => {
    const overview = mapReferralOverview({
      history: [{ id: "x", reason: "unknown", delta: 1 }, null, "junk"],
      invitees: [null],
    });
    expect(overview.history).toEqual([]);
    expect(overview.invitees).toEqual([]);
    expect(overview.credits).toEqual({ earned: 0, used: 0, takenBack: 0, adjusted: 0, available: 0 });
    expect(mapReferralOverview(null).code).toBeNull();
  });
});

describe("fetchMyReferralOverview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws a readable error when the RPC fails", async () => {
    callRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(fetchMyReferralOverview()).rejects.toThrow("boom");
    expect(callRpc).toHaveBeenCalledWith("get_my_referral_overview");
  });
});
