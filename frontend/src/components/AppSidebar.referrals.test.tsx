import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import PartnerPortal from "@/pages/PartnerPortal";

// NCLDD-56 test plan A5: sidebar referral items and `/partner` access.

const callRpc = vi.fn();
let currentUser: { id: string } | null = null;
let profile: Record<string, unknown> | null = null;
let hr = { isHrContact: false, isPortalOnlyHr: false };

vi.mock("@/lib/supabase/rpc", () => ({
  callRpc: (...args: unknown[]) => callRpc(...args),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: currentUser, session: null, loading: false }),
}));

vi.mock("@/lib/userProfile", () => ({
  useUserProfile: () => ({ profile, loading: false }),
}));

vi.mock("@/hooks/useHrWorkplaces", () => ({
  useHrWorkplaces: () => hr,
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const partnerPayload = {
  partner: { name: "Coach Co", code: "ABCD2345", status: "active" },
  termsStatus: "confirmed",
  terms: { commissionPercent: 20, scope: "lifetime", scopeMonths: null },
  clients: [],
  totals: { linkVisits: 3, signups: 1, payingClients: 0, payments: 0, pendingTermsPayments: 0, earned: [] },
};

// `useIsReferralPartner` caches per user id for the page load, so each test uses a fresh id.
let userSeq = 0;
function signIn() {
  currentUser = { id: `user-${++userSeq}` };
}

function mockRpc(handlers: Record<string, { data: unknown; error: unknown }>) {
  callRpc.mockImplementation((fn: string) =>
    Promise.resolve(handlers[fn] ?? { data: null, error: { message: `unexpected rpc ${fn}` } }),
  );
}

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("AppSidebar referral items (A5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profile = { accountType: "individual" };
    hr = { isHrContact: false, isPortalOnlyHr: false };
    signIn();
  });

  it("shows Invite a friend -> /invite for a regular user and hides Partner portal for non-partners", async () => {
    mockRpc({ is_my_referral_partner: { data: false, error: null } });
    renderSidebar();

    expect(screen.getByRole("link", { name: /Invite a friend/ })).toHaveAttribute("href", "/invite");
    await waitFor(() => expect(callRpc).toHaveBeenCalledWith("is_my_referral_partner"));
    expect(screen.queryByRole("link", { name: /Partner portal/ })).not.toBeInTheDocument();
  });

  it("shows Invite a friend for enterprise users too", () => {
    profile = { accountType: "enterprise" };
    mockRpc({ is_my_referral_partner: { data: false, error: null } });
    renderSidebar();

    expect(screen.getByRole("link", { name: /Invite a friend/ })).toHaveAttribute("href", "/invite");
  });

  it("shows Partner portal -> /partner when the RPC says the account is linked", async () => {
    mockRpc({ is_my_referral_partner: { data: true, error: null } });
    renderSidebar();

    const link = await screen.findByRole("link", { name: /Partner portal/ });
    expect(link).toHaveAttribute("href", "/partner");
    expect(screen.getByRole("link", { name: /Invite a friend/ })).toBeInTheDocument();
  });

  it("hides Partner portal when the RPC errors", async () => {
    mockRpc({ is_my_referral_partner: { data: null, error: { message: "boom" } } });
    renderSidebar();

    await waitFor(() => expect(callRpc).toHaveBeenCalledWith("is_my_referral_partner"));
    expect(screen.queryByRole("link", { name: /Partner portal/ })).not.toBeInTheDocument();
  });

  it("hides Partner portal for a truthy non-boolean RPC payload", async () => {
    mockRpc({ is_my_referral_partner: { data: "true", error: null } });
    renderSidebar();

    await waitFor(() => expect(callRpc).toHaveBeenCalledWith("is_my_referral_partner"));
    expect(screen.queryByRole("link", { name: /Partner portal/ })).not.toBeInTheDocument();
  });
});

function renderPartnerRoute() {
  return render(
    <MemoryRouter initialEntries={["/partner"]}>
      <Routes>
        <Route path="/partner" element={<PartnerPortal />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("/partner route access (A5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
  });

  it("redirects non-partners to /dashboard", async () => {
    mockRpc({ get_my_referral_partner_portal: { data: null, error: null } });
    renderPartnerRoute();

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(callRpc).toHaveBeenCalledWith("get_my_referral_partner_portal");
  });

  it("redirects when the RPC returns a payload without a partner code", async () => {
    mockRpc({ get_my_referral_partner_portal: { data: { partner: { name: "X" } }, error: null } });
    renderPartnerRoute();

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });

  it("renders the portal for a linked partner", async () => {
    mockRpc({ get_my_referral_partner_portal: { data: partnerPayload, error: null } });
    renderPartnerRoute();

    expect(await screen.findByText(/Coach Co ·/)).toBeInTheDocument();
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
  });

  it("shows a retry state instead of redirecting when the RPC fails", async () => {
    mockRpc({ get_my_referral_partner_portal: { data: null, error: { message: "boom" } } });
    renderPartnerRoute();

    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
  });
});
