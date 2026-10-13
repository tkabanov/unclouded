import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import BookCoachCard from "@/components/coach/BookCoachCard";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { BOOKING_HELPER_ENOUGH_CREDITS } from "@/lib/subscription/subscriptionCopy";

/**
 * NCLDD-56 test plan A6 (OVR-074): a referral coach credit books a human-coach 1:1 on any
 * plan and is spent before Premium credits; it never applies to AI sessions; with no
 * referral credit, Free keeps the normal Premium paywall.
 */

const state = vi.hoisted(() => ({
  tier: "free" as string,
  creditBalance: 0,
  referralCredits: 0,
  refreshOverview: vi.fn(async () => {}),
  refreshReferral: vi.fn(async () => {}),
}));

const api = vi.hoisted(() => ({
  listActiveCoachesForBooking: vi.fn(),
  listMyPreviousOneOnOneCoaches: vi.fn(),
  listBookableOneOnOneSlots: vi.fn(),
  listBookableOneOnOneSlotsAnyCoach: vi.fn(),
  fetchMyCoachBookings: vi.fn(),
  confirmOneOnOneBooking: vi.fn(),
  cancelOneOnOneBooking: vi.fn(),
}));

vi.mock("@/hooks/useSubscriptionOverview", () => ({
  useSubscriptionOverview: () => ({
    overview: {
      effectiveTier: state.tier,
      credits: { balance: state.creditBalance, requiredPerSession: 2 },
    },
    record: null,
    loading: false,
    error: null,
    refresh: state.refreshOverview,
    applyOverview: () => {},
  }),
}));

vi.mock("@/hooks/useEffectiveTier", () => ({
  useEffectiveTier: () => ({ tier: state.tier, loading: false }),
}));

vi.mock("@/hooks/useReferralCoachCredits", () => ({
  useReferralCoachCredits: () => ({
    credits: state.referralCredits,
    loading: false,
    refresh: state.refreshReferral,
  }),
}));

vi.mock("@/lib/userProfile", () => ({
  useUserProfile: () => ({ profile: { accountType: "individual" } }),
}));

vi.mock("@/components/coach/GroupCoachingPanel", () => ({
  default: ({ canJoin, locked }: { canJoin: boolean; locked: boolean }) => (
    <div data-testid="group-panel" data-can-join={String(canJoin)} data-locked={String(locked)} />
  ),
}));

vi.mock("@/components/subscription/LockedFeatureUpgradeDialog", () => ({
  default: ({ feature }: { feature: string }) => <div data-testid="upsell-dialog">{feature}</div>,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/coach/coachBookingApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/coach/coachBookingApi")>();
  return { ...actual, ...api };
});

/** Booking helper copy shown when a referral credit will pay for the session. */
const REFERRAL_HELPER = /referral credit will be used|You have \d+ referral credit/;

const COACH = { id: "coach-1", name: "Human Coach", imageUrl: null, bio: "" };

function setUser(tier: TierSlug, creditBalance: number, referralCredits: number) {
  state.tier = tier;
  state.creditBalance = creditBalance;
  state.referralCredits = referralCredits;
}

beforeEach(() => {
  // Fake only Date so slots land on "today" deterministically; promises/timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 13, 9, 0, 0));

  const slotStart = new Date(2026, 9, 13, 15, 0, 0).toISOString();
  const slotEnd = new Date(2026, 9, 13, 15, 30, 0).toISOString();

  api.listActiveCoachesForBooking.mockResolvedValue([COACH]);
  api.listMyPreviousOneOnOneCoaches.mockResolvedValue([]);
  api.listBookableOneOnOneSlots.mockResolvedValue([
    { slotStart, slotEnd, durationMinutes: 30 },
  ]);
  api.listBookableOneOnOneSlotsAnyCoach.mockResolvedValue([]);
  api.fetchMyCoachBookings.mockResolvedValue([]);
  api.confirmOneOnOneBooking.mockResolvedValue({
    status: "ok",
    bookingId: "booking-1",
    balance: 4,
    specialistName: COACH.name,
    kotaRead: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("BookCoachCard — referral coach credits (A6)", () => {
  it("Premium with both Premium and referral credits: referral credit is the one used", async () => {
    setUser(TIER.PREMIUM, 4, 1);
    render(<BookCoachCard />);

    expect(
      screen.getByText(/One referral credit will be used after your booking is confirmed\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(BOOKING_HELPER_ENOUGH_CREDITS)).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Select coach" }));
    fireEvent.click(await screen.findByRole("button", { name: /15:00 · 30m/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm session" }));

    await waitFor(() => expect(api.confirmOneOnOneBooking).toHaveBeenCalledTimes(1));
    // The client never picks the payment source: confirm_one_on_one_booking spends the
    // referral credit first server-side. Only slot + human coach are sent.
    expect(api.confirmOneOnOneBooking).toHaveBeenCalledWith({
      slotStart: new Date(2026, 9, 13, 15, 0, 0).toISOString(),
      durationMinutes: 30,
      specialistId: COACH.id,
    });
    await waitFor(() => expect(state.refreshReferral).toHaveBeenCalled());
    expect(state.refreshOverview).toHaveBeenCalled();
  });

  it("Premium without referral credits uses the normal Premium-credit copy", () => {
    setUser(TIER.PREMIUM, 4, 0);
    render(<BookCoachCard />);

    expect(screen.getByText(BOOKING_HELPER_ENOUGH_CREDITS)).toBeInTheDocument();
    expect(screen.queryByText(REFERRAL_HELPER)).not.toBeInTheDocument();
  });

  it.each([TIER.FREE, TIER.PRO])("%s with a referral credit can book a human coach 1:1", async (tier) => {
    setUser(tier, 0, 2);
    render(<BookCoachCard />);

    expect(screen.getByText(/You have 2 referral credits\./)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Select coach" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Book a 1:1 session.*Premium/i })).not.toBeInTheDocument();
    expect(api.listActiveCoachesForBooking).toHaveBeenCalled();
  });

  it("Free with a referral credit does not unlock group sessions (1:1 only)", () => {
    setUser(TIER.FREE, 0, 1);
    render(<BookCoachCard />);

    const group = screen.getByTestId("group-panel");
    expect(group).toHaveAttribute("data-can-join", "false");
    expect(group).toHaveAttribute("data-locked", "true");
  });

  it("Free with 0 referral credits: no credit option, normal Premium paywall", async () => {
    setUser(TIER.FREE, 0, 0);
    render(<BookCoachCard />);

    expect(screen.queryByText(REFERRAL_HELPER)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select coach" })).not.toBeInTheDocument();
    expect(api.listActiveCoachesForBooking).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Book a 1:1 session.*Premium/i }));
    expect(await screen.findByTestId("upsell-dialog")).toHaveTextContent("oneOnOneSession");
    expect(api.confirmOneOnOneBooking).not.toHaveBeenCalled();
  });
});

describe("referral coach credits are never offered for AI sessions (A6)", () => {
  const sources = import.meta.glob("/src/**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  it("only the human-coach booking card consumes the referral credit balance", () => {
    const consumers = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path))
      .filter(([, code]) =>
        /useReferralCoachCredits|fetchMyReferralCoachCredits|my_referral_coach_credit_balance/.test(code),
      )
      .map(([path]) => path)
      .sort();

    expect(consumers).toEqual([
      "/src/components/coach/BookCoachCard.tsx",
      "/src/hooks/useReferralCoachCredits.ts",
      "/src/lib/referrals/referralCoachCreditsApi.ts",
    ]);
  });
});
