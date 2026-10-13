import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AdminReferralPartnersTab from "@/components/settings/admin/AdminReferralPartnersTab";
import { formatMoney } from "@/lib/referrals/referralCopy";
import type { AdminReferralPartnerRecord } from "@/lib/settings/admin/referralPartnersApi";
import type { AdminPartnerMetrics } from "@/lib/settings/admin/referralProgramAdminApi";

/**
 * NCLDD-56 test plan A7 (OVR-074): admin partner comparison — sort by sign-ups / paying /
 * commission in both directions; a partner without confirmed terms shows no earnings.
 */

const api = vi.hoisted(() => ({
  fetchAdminReferralPartners: vi.fn(),
  fetchAdminReferralPartnerMetrics: vi.fn(),
}));

vi.mock("@/lib/settings/admin/referralPartnersApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings/admin/referralPartnersApi")>();
  return { ...actual, fetchAdminReferralPartners: api.fetchAdminReferralPartners };
});

vi.mock("@/lib/settings/admin/referralProgramAdminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings/admin/referralProgramAdminApi")>();
  return { ...actual, fetchAdminReferralPartnerMetrics: api.fetchAdminReferralPartnerMetrics };
});

vi.mock("@/components/settings/admin/AddReferralPartnerPopup", () => ({ default: () => null }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function partner(id: string, name: string): AdminReferralPartnerRecord {
  return {
    partnerId: id,
    name,
    type: "coach",
    email: `${id}@example.com`,
    contactInfo: "",
    status: "active",
    referralCode: id.toUpperCase(),
    trackingUrl: "",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  };
}

function metrics(
  partnerId: string,
  values: Partial<AdminPartnerMetrics> & Pick<AdminPartnerMetrics, "signups" | "payingClients">,
): AdminPartnerMetrics {
  return {
    partnerId,
    linkVisits: 0,
    confirmed: 0,
    payments: values.payingClients,
    pendingTermsPayments: 0,
    earned: [],
    termsStatus: "confirmed",
    terms: { commissionPercent: 20, scope: "lifetime", scopeMonths: null, effectiveFrom: "2026-10-01" },
    linkedEmail: null,
    ...values,
  } as AdminPartnerMetrics;
}

// Each metric ranks the partners differently, so a wrong sort key is caught.
//            signups  paying  commission
// Alpha         5       1       50 USD
// Bravo        10       3       10 USD
// Charlie       1       2       30 USD
// Delta (no terms) 3    0       — (pending)
const PARTNERS = [
  partner("p-alpha", "Alpha"),
  partner("p-bravo", "Bravo"),
  partner("p-charlie", "Charlie"),
  partner("p-delta", "Delta"),
];

const METRICS: AdminPartnerMetrics[] = [
  metrics("p-alpha", { signups: 5, payingClients: 1, earned: [{ currency: "usd", cents: 5000 }] }),
  metrics("p-bravo", { signups: 10, payingClients: 3, earned: [{ currency: "usd", cents: 1000 }] }),
  metrics("p-charlie", { signups: 1, payingClients: 2, earned: [{ currency: "usd", cents: 3000 }] }),
  metrics("p-delta", {
    signups: 3,
    payingClients: 0,
    pendingTermsPayments: 2,
    earned: [],
    termsStatus: "not_configured",
    terms: null,
  }),
];

function renderTab() {
  return render(
    <MemoryRouter>
      <AdminReferralPartnersTab />
    </MemoryRouter>,
  );
}

function rowNames(): string[] {
  const body = screen.getAllByRole("rowgroup")[1];
  return within(body)
    .getAllByRole("row")
    .map((row) => within(row).getAllByRole("link")[0].textContent ?? "");
}

/** Collapses NBSP / narrow spaces from locale money formatting. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Text of the Commission column (7th cell) of a partner row. */
function commissionText(row: HTMLElement): string {
  return normalize((row as HTMLTableRowElement).cells[6].textContent ?? "");
}

function clickHeader(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

beforeEach(() => {
  api.fetchAdminReferralPartners.mockResolvedValue(PARTNERS);
  api.fetchAdminReferralPartnerMetrics.mockResolvedValue(METRICS);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminReferralPartnersTab — partner comparison (A7)", () => {
  it("defaults to name order", async () => {
    renderTab();
    await screen.findByText("Alpha");
    expect(rowNames()).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
  });

  it.each([
    ["Sign-ups", ["Bravo", "Alpha", "Delta", "Charlie"]],
    ["Paying", ["Bravo", "Charlie", "Alpha", "Delta"]],
    ["Commission", ["Alpha", "Charlie", "Bravo", "Delta"]],
  ])("sorts by %s descending first, then ascending on a second click", async (label, desc) => {
    renderTab();
    await screen.findByText("Alpha");

    clickHeader(label);
    expect(rowNames()).toEqual(desc);

    clickHeader(label);
    expect(rowNames()).toEqual([...desc].reverse());

    clickHeader(label);
    expect(rowNames()).toEqual(desc);
  });

  it("switching sort column restarts in descending order", async () => {
    renderTab();
    await screen.findByText("Alpha");

    clickHeader("Sign-ups");
    clickHeader("Sign-ups"); // ascending
    clickHeader("Paying");
    expect(rowNames()).toEqual(["Bravo", "Charlie", "Alpha", "Delta"]);
  });

  it("partner without confirmed terms shows 'not set' and no commission amount", async () => {
    renderTab();
    const link = await screen.findByRole("link", { name: "Delta" });
    const row = link.closest("tr") as HTMLElement;

    expect(within(row).getByText("Terms not set")).toBeInTheDocument();
    expect(within(row).getByText("No terms")).toBeInTheDocument();
    expect(within(row).getByText("2 payments awaiting terms")).toBeInTheDocument();
    // No money amount at all — not even a zero amount.
    expect(commissionText(row)).not.toContain("$");
  });

  it("partner with confirmed terms shows its commission and terms", async () => {
    renderTab();
    const row = (await screen.findByRole("link", { name: "Alpha" })).closest("tr") as HTMLElement;

    expect(commissionText(row)).toContain(normalize(formatMoney(5000, "usd")));
    expect(within(row).getByText(/20% · lifetime/)).toBeInTheDocument();
    expect(within(row).queryByText("Terms not set")).not.toBeInTheDocument();
  });

  it("confirmed terms with nothing earned yet show a zero amount, unlike missing terms", async () => {
    api.fetchAdminReferralPartnerMetrics.mockResolvedValue([
      metrics("p-alpha", { signups: 1, payingClients: 0, earned: [] }),
    ]);
    renderTab();
    const row = (await screen.findByRole("link", { name: "Alpha" })).closest("tr") as HTMLElement;

    expect(commissionText(row)).toBe(normalize(formatMoney(0, "usd")));
  });
});
