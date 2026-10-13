import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchIsReferralPartner,
  fetchMyPartnerPortal,
  mapPartnerPortal,
} from "@/lib/referrals/partnerPortalApi";

const callRpc = vi.fn();

vi.mock("@/lib/supabase/rpc", () => ({
  callRpc: (...args: unknown[]) => callRpc(...args),
}));

const payload = {
  partner: { name: "Coach Co", code: "ABCD2345", status: "active" },
  termsStatus: "confirmed",
  terms: { commissionPercent: 20, scope: "months", scopeMonths: 12, effectiveFrom: "2026-01-01T00:00:00Z", confirmedAt: "2026-01-02T00:00:00Z" },
  clients: [
    { displayName: "Wendy W.", joinedAt: "2026-09-01T00:00:00Z", status: "paying", payments: 2, pendingTermsPayments: 0, earned: [{ currency: "usd", cents: 870 }] },
  ],
  totals: { signups: 1, payingClients: 1, payments: 2, pendingTermsPayments: 0, earned: [{ currency: "usd", cents: 870 }] },
};

describe("mapPartnerPortal", () => {
  it("maps a confirmed-terms portal", () => {
    const portal = mapPartnerPortal(payload);
    expect(portal?.partner.code).toBe("ABCD2345");
    expect(portal?.termsStatus).toBe("confirmed");
    expect(portal?.terms).toMatchObject({ commissionPercent: 20, scope: "months", scopeMonths: 12 });
    expect(portal?.clients[0]).toMatchObject({
      displayName: "Wendy W.",
      earned: [{ currency: "usd", cents: 870 }],
    });
    expect(portal?.totals.earned).toEqual([{ currency: "usd", cents: 870 }]);
  });

  it("never reports confirmed terms without parseable terms", () => {
    const portal = mapPartnerPortal({ ...payload, terms: { commissionPercent: 0, scope: "lifetime" } });
    expect(portal?.termsStatus).toBe("not_configured");
    expect(portal?.terms).toBeNull();
  });

  it("returns null for a non-partner", () => {
    expect(mapPartnerPortal(null)).toBeNull();
    expect(mapPartnerPortal({})).toBeNull();
  });
});

describe("partner portal RPCs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the portal", async () => {
    callRpc.mockResolvedValue({ data: payload, error: null });
    await expect(fetchMyPartnerPortal()).resolves.toMatchObject({ partner: { name: "Coach Co" } });
    expect(callRpc).toHaveBeenCalledWith("get_my_referral_partner_portal");
  });

  it("treats errors as not-a-partner for the sidebar check", async () => {
    callRpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(fetchIsReferralPartner()).resolves.toBe(true);
    callRpc.mockResolvedValueOnce({ data: null, error: { message: "missing" } });
    await expect(fetchIsReferralPartner()).resolves.toBe(false);
  });
});
