import { beforeEach, describe, expect, it, vi } from "vitest";

import { getReferralVisitorId, recordReferralLinkVisit } from "@/lib/share/referralLinkClick";

const callRpc = vi.fn();

vi.mock("@/lib/supabase/rpc", () => ({
  callRpc: (...args: unknown[]) => callRpc(...args),
}));

describe("referral link visits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    callRpc.mockResolvedValue({ data: true, error: null });
  });

  it("keeps a stable anonymous visitor id", () => {
    const id = getReferralVisitorId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getReferralVisitorId()).toBe(id);
  });

  it("records a code once per session", async () => {
    await recordReferralLinkVisit("ABCD2345");
    await recordReferralLinkVisit("ABCD2345");
    expect(callRpc).toHaveBeenCalledTimes(1);
    expect(callRpc).toHaveBeenCalledWith("record_referral_link_click", {
      p_code: "ABCD2345",
      p_visitor_id: getReferralVisitorId(),
    });
  });

  it("never throws when the RPC fails", async () => {
    callRpc.mockRejectedValue(new Error("network"));
    await expect(recordReferralLinkVisit("WXYZ2345")).resolves.toBeUndefined();
  });
});
