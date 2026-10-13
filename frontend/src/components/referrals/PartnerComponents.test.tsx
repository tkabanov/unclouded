import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PartnerClientsList from "@/components/referrals/PartnerClientsList";
import PartnerEarningsSummary from "@/components/referrals/PartnerEarningsSummary";
import type { PartnerPortal } from "@/lib/referrals/partnerPortalApi";
import { describePartnerTerms } from "@/lib/referrals/referralCopy";

const basePortal: PartnerPortal = {
  partner: { name: "Coach Co", code: "ABCD2345", status: "active" },
  termsStatus: "confirmed",
  terms: { commissionPercent: 20, scope: "lifetime", scopeMonths: null, effectiveFrom: null, confirmedAt: null },
  clients: [],
  totals: { signups: 2, payingClients: 1, payments: 2, pendingTermsPayments: 0, earned: [{ currency: "usd", cents: 870 }] },
};

describe("describePartnerTerms", () => {
  it("describes each scope", () => {
    expect(describePartnerTerms({ ...basePortal.terms!, scope: "lifetime" })).toBe("20% of every payment");
    expect(describePartnerTerms({ ...basePortal.terms!, scope: "first_payment" })).toBe(
      "20% of each client's first payment",
    );
    expect(describePartnerTerms({ ...basePortal.terms!, scope: "months", scopeMonths: 12 })).toBe(
      "20% of every payment during a client's first 12 months",
    );
  });
});

describe("PartnerEarningsSummary", () => {
  it("shows confirmed terms and net earnings", () => {
    render(<PartnerEarningsSummary portal={basePortal} />);
    expect(screen.getByText(/Your terms: 20% of every payment/)).toBeInTheDocument();
    expect(screen.getByText("Earned").previousSibling?.textContent).toMatch(/8[.,]70/);
  });

  it("never shows an earned amount without confirmed terms", () => {
    render(
      <PartnerEarningsSummary
        portal={{
          ...basePortal,
          termsStatus: "not_configured",
          terms: null,
          totals: { ...basePortal.totals, earned: [], pendingTermsPayments: 3 },
        }}
      />,
    );
    expect(screen.getByText("Earned").previousSibling).toHaveTextContent("—");
    expect(screen.getByText(/haven't been confirmed yet/)).toBeInTheDocument();
    expect(screen.getByText(/3 payments are not covered by confirmed terms/)).toBeInTheDocument();
  });

  it("keeps past earnings visible and says so when terms were archived", () => {
    render(
      <PartnerEarningsSummary
        portal={{ ...basePortal, termsStatus: "not_configured", terms: null }}
      />,
    );
    expect(screen.getByText("Earned").previousSibling?.textContent).toMatch(/8[.,]70/);
    expect(screen.getByText(/Earnings shown are from your earlier confirmed terms/)).toBeInTheDocument();
  });
});

describe("PartnerClientsList", () => {
  it("shows per-client earnings, or 'Not calculated' while payments wait for terms", () => {
    const clients = [
      { displayName: "Wendy W.", joinedAt: null, status: "paying" as const, payments: 2, pendingTermsPayments: 0, earned: [{ currency: "usd", cents: 870 }] },
      { displayName: "Xena X.", joinedAt: null, status: "paying" as const, payments: 1, pendingTermsPayments: 1, earned: [] },
      { displayName: "Walter W.", joinedAt: null, status: "signed_up" as const, payments: 0, pendingTermsPayments: 0, earned: [] },
    ];
    render(<PartnerClientsList clients={clients} />);
    expect(screen.getByText(/8[.,]70/)).toBeInTheDocument();
    expect(screen.getByText("Not calculated")).toBeInTheDocument();
    expect(screen.getByText(/1 awaiting terms/)).toBeInTheDocument();
    expect(screen.getByText("Signed up")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("never shows $0 for a client whose payments predate the confirmed terms", () => {
    render(
      <PartnerClientsList
        clients={[
          { displayName: "Early E.", joinedAt: null, status: "paying", payments: 2, pendingTermsPayments: 2, earned: [] },
          { displayName: "Scope S.", joinedAt: null, status: "paying", payments: 1, pendingTermsPayments: 0, earned: [] },
        ]}
      />,
    );
    expect(screen.getByText("Not calculated")).toBeInTheDocument();
    // Only the client still waiting for terms is "Not calculated"; the out-of-scope one is a decided 0.
    expect(screen.getAllByText("Not calculated")).toHaveLength(1);
  });
});
