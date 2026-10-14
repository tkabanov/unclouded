import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ReferralCreditHistory from "@/components/referrals/ReferralCreditHistory";
import ReferralCreditsSummary from "@/components/referrals/ReferralCreditsSummary";
import ReferralInviteesList from "@/components/referrals/ReferralInviteesList";
import ReferralLinkCard from "@/components/referrals/ReferralLinkCard";

describe("ReferralInviteesList", () => {
  it("shows masked names with their status", () => {
    render(
      <ReferralInviteesList
        totalInvited={3}
        invitees={[
          { displayName: "Anna S.", joinedAt: "2026-10-01T12:00:00Z", status: "rewarded", rewardedAt: "2026-10-05T12:00:00Z" },
          { displayName: "Ivan P.", joinedAt: "2026-10-02T12:00:00Z", status: "refunded", rewardedAt: "2026-10-06T12:00:00Z" },
          { displayName: "Friend", joinedAt: null, status: "pending_confirmation", rewardedAt: null },
        ]}
      />,
    );
    expect(screen.getByText("Anna S.")).toBeInTheDocument();
    expect(screen.getByText("Credit earned")).toBeInTheDocument();
    expect(screen.getByText("Payment refunded")).toBeInTheDocument();
    expect(screen.getByText("Awaiting email confirmation")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("explains the empty state", () => {
    render(<ReferralInviteesList totalInvited={0} invitees={[]} />);
    expect(screen.getByText(/No one has signed up with your link yet/)).toBeInTheDocument();
  });
});

describe("ReferralCreditsSummary", () => {
  it("shows totals and the booking shortcut when a credit is available", () => {
    render(
      <MemoryRouter>
        <ReferralCreditsSummary credits={{ earned: 3, used: 1, takenBack: 1, adjusted: 0, available: 1 }} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Available").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Earned").previousSibling).toHaveTextContent("3");
    expect(screen.getByText(/1 credit was removed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a 1:1 session" })).toHaveAttribute("href", "/dashboard");
  });

  it("hides the booking shortcut without credits", () => {
    render(
      <MemoryRouter>
        <ReferralCreditsSummary credits={{ earned: 0, used: 0, takenBack: 0, adjusted: 0, available: 0 }} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: "Book a 1:1 session" })).toBeNull();
  });
});

describe("ReferralCreditHistory", () => {
  it("labels each ledger event", () => {
    render(
      <ReferralCreditHistory
        history={[
          { id: "1", reason: "redemption", delta: -1, createdAt: "2026-10-06T12:00:00Z", friendName: null, sessionAt: "2026-10-09T12:00:00Z" },
          { id: "2", reason: "referral_reward", delta: 1, createdAt: "2026-10-05T12:00:00Z", friendName: "Anna S.", sessionAt: null },
        ]}
      />,
    );
    expect(screen.getByText("Used for a 1:1 session")).toBeInTheDocument();
    expect(screen.getByText("Credit earned")).toBeInTheDocument();
    expect(screen.getByText(/Anna S\./)).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});

describe("ReferralLinkCard", () => {
  it("shows the permanent link and code", () => {
    render(<ReferralLinkCard code="ABCD2345" shareUrl="https://uncloud360.ai/signup?ref=ABCD2345" />);
    expect(screen.getByText("https://uncloud360.ai/signup?ref=ABCD2345")).toBeInTheDocument();
    expect(screen.getByText("ABCD2345")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy link/ })).toBeInTheDocument();
  });
});
