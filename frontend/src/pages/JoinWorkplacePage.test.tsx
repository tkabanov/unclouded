import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import type { UserProfile } from "@/lib/userProfile";
import { supabase } from "@/integrations/supabase/client";
import { redeemWorkplaceEnrollmentCode } from "@/lib/workplace/workplaceEnrollmentApi";
import JoinWorkplacePage from "@/pages/JoinWorkplacePage";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));
vi.mock("@/hooks/useAuth");
vi.mock("@/lib/userProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/userProfile")>();
  return { ...actual, useUserProfile: vi.fn() };
});
vi.mock("@/lib/workplace/workplaceEnrollmentApi", () => ({
  redeemWorkplaceEnrollmentCode: vi.fn(),
}));
vi.mock("@/lib/userProfile/onboardingStatus", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/userProfile/onboardingStatus")>();
  return {
    ...actual,
    resolvePostAuthRouteForUser: vi.fn().mockResolvedValue("/dashboard"),
  };
});
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const completeFreeProfile: UserProfile = {
  firstName: "Ref",
  lastName: "Three",
  roleType: "individual",
  roleTypes: ["individual"],
  primaryPillar: "emotional",
  results: null,
  onboardingCompleted: true,
  onboardingCompletedAt: "2026-08-01T00:00:00.000Z",
  onboardingData: null,
  subscribed: false,
  tier: null,
  accountType: "individual",
  enterpriseTier: null,
  enrollmentDate: null,
  signupPlan: null,
  lastAssessmentDate: null,
  nextReassessmentDate: null,
  canReassessOnDemand: false,
  reassessmentResults: null,
  reassessmentReflections: null,
  reassessmentCompletedAt: null,
};

function peekInvokeCount(): number {
  return vi
    .mocked(supabase.functions.invoke)
    .mock.calls.filter(([name]) => name === "peek-workplace-enrollment").length;
}

function renderJoin(options?: { startProfileLoading?: boolean }) {
  function Harness() {
    const [profile, setProfile] = useState(completeFreeProfile);
    const [profileLoading, setProfileLoading] = useState(options?.startProfileLoading ?? false);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", email: "referee3@test.com" },
      loading: false,
      session: null,
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    } as never);

    vi.mocked(useUserProfile).mockReturnValue({
      profile,
      loading: profileLoading,
      refresh: vi.fn(async () => {
        setProfile((prev) => ({
          ...prev,
          accountType: "enterprise",
          enterpriseTier: "pro",
        }));
      }),
    } as never);

    return (
      <>
        <button type="button" onClick={() => setProfileLoading(false)}>
          finish-profile
        </button>
        <Routes>
          <Route path="/join/:code" element={<JoinWorkplacePage />} />
          <Route path="/dashboard" element={<div>Dashboard home</div>} />
          <Route path="/signup" element={<div>Signup home</div>} />
          <Route path="/onboarding" element={<div>Onboarding home</div>} />
        </Routes>
      </>
    );
  }

  return render(
    <MemoryRouter
      initialEntries={["/join/ORG6663"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Harness />
    </MemoryRouter>,
  );
}

describe("JoinWorkplacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true, workplaceName: "HRONLY" },
      error: null,
    } as never);
    vi.mocked(redeemWorkplaceEnrollmentCode).mockResolvedValue({
      workplaceId: "wp-1",
      workplaceName: "HRONLY",
      enterpriseTier: "pro",
      alreadyEnrolled: false,
    });
  });

  it("redeems in place once, toasts, and goes to dashboard even if profile refresh rerenders", async () => {
    renderJoin({ startProfileLoading: true });

    expect(screen.getByText(/Checking enrollment link/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("finish-profile"));

    await waitFor(() => {
      expect(screen.getByText("Dashboard home")).toBeInTheDocument();
    });

    expect(peekInvokeCount()).toBe(1);
    expect(redeemWorkplaceEnrollmentCode).toHaveBeenCalledTimes(1);
    expect(redeemWorkplaceEnrollmentCode).toHaveBeenCalledWith("ORG6663");
    expect(toast.success).toHaveBeenCalledWith("Joined HRONLY.");
  });

  it("does not peek again when profile identity changes after a successful peek", async () => {
    renderJoin({ startProfileLoading: false });

    await waitFor(() => {
      expect(screen.getByText("Dashboard home")).toBeInTheDocument();
    });

    expect(peekInvokeCount()).toBe(1);
    expect(redeemWorkplaceEnrollmentCode).toHaveBeenCalledTimes(1);
  });

  it("shows the 429 peek error without redeeming", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: "rate limited", context: { status: 429 } },
    } as never);

    renderJoin();

    await waitFor(() => {
      expect(screen.getByText(/Couldn't validate link/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Too many enrollment lookups/i)).toBeInTheDocument();
    expect(redeemWorkplaceEnrollmentCode).not.toHaveBeenCalled();
  });
});
