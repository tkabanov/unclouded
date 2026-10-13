import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmAdminPartnerTerms,
  linkAdminPartnerAccount,
  mapAdminPartnerMetrics,
  mapAdminPartnerProgram,
  mapAdminUserReferralStats,
  validatePartnerTermsInput,
} from "@/lib/settings/admin/referralProgramAdminApi";

const callRpc = vi.fn();

vi.mock("@/lib/supabase/rpc", () => ({
  callRpc: (...args: unknown[]) => callRpc(...args),
}));

describe("mappers", () => {
  it("maps user stats", () => {
    expect(
      mapAdminUserReferralStats({
        invites: { invited: 2, registered: 1, paidProPremium: 1, movedToPartner: 1 },
        credits: { earned: 1, used: 0, takenBack: 0, adjusted: 0, available: 1 },
      }),
    ).toEqual({
      invites: { invited: 2, registered: 1, paidProPremium: 1, movedToPartner: 1 },
      credits: { earned: 1, used: 0, takenBack: 0, adjusted: 0, available: 1 },
    });
  });

  it("maps partner metrics and never marks unparseable terms as confirmed", () => {
    const rows = mapAdminPartnerMetrics([
      {
        partnerId: "p1",
        signups: 2,
        payingClients: 1,
        earned: [{ currency: "usd", cents: 790 }],
        termsStatus: "confirmed",
        terms: { commissionPercent: 10, scope: "lifetime" },
        linkedEmail: "l@example.com",
      },
      { partnerId: "p2", termsStatus: "confirmed", terms: { commissionPercent: 10, scope: "bogus" } },
      { nope: true },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ partnerId: "p1", termsStatus: "confirmed", earned: [{ currency: "usd", cents: 790 }] });
    expect(rows[1].termsStatus).toBe("not_configured");
  });

  it("maps the partner program", () => {
    const program = mapAdminPartnerProgram({
      linkedAccount: { email: "l@example.com", linkedAt: "2026-10-13T00:00:00Z" },
      terms: [{ id: "t1", status: "archived", commissionPercent: 10, scope: "months", scopeMonths: 6 }],
      clients: [{ userId: "u1", name: "Wes Client", payments: 1, earned: [{ currency: "usd", cents: 790 }] }],
    });
    expect(program?.linkedAccount?.email).toBe("l@example.com");
    expect(program?.terms[0]).toMatchObject({ status: "archived", scopeMonths: 6 });
    expect(program?.clients[0]).toMatchObject({ name: "Wes Client", earned: [{ currency: "usd", cents: 790 }] });
    expect(mapAdminPartnerProgram(null)).toBeNull();
  });
});

describe("validatePartnerTermsInput", () => {
  it("validates percent and months from the raw text", () => {
    const check = (commissionPercent: string, scope: "lifetime" | "months" = "lifetime", scopeMonths = "") =>
      validatePartnerTermsInput({ commissionPercent, scope, scopeMonths });
    expect(check("20")).toBeNull();
    for (const ok of ["2.3", "8.2", "1.15", "4.35", "0.29", "0.57", "100"]) expect(check(ok)).toBeNull();
    expect(check("0")).toMatch(/more than 0%/);
    expect(check("120")).toMatch(/100%/);
    expect(check("12.345")).toMatch(/two decimals/);
    expect(check("0x10")).toMatch(/two decimals/);
    expect(check("1e1")).toMatch(/two decimals/);
    expect(check("10", "months", "0")).toMatch(/1 to 120/);
    expect(check("10", "months", "1.5")).toMatch(/1 to 120/);
    expect(check("10", "months", "12")).toBeNull();
  });
});

describe("admin write RPCs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends months only for the months scope", async () => {
    callRpc.mockResolvedValue({ data: { termsId: "t" }, error: null });
    await confirmAdminPartnerTerms({
      partnerId: "p1",
      commissionPercent: 10,
      scope: "lifetime",
      scopeMonths: 12,
      effectiveFrom: null,
      note: null,
    });
    expect(callRpc).toHaveBeenCalledWith("admin_confirm_referral_partner_terms", expect.objectContaining({
      p_scope: "lifetime",
      p_scope_months: null,
    }));
  });

  it("surfaces the RPC's error when linking fails", async () => {
    callRpc.mockResolvedValue({ data: { ok: false, code: "user_not_found", error: "No confirmed account uses this email." }, error: null });
    await expect(linkAdminPartnerAccount("p1", "x@example.com")).rejects.toThrow("No confirmed account");
  });
});
