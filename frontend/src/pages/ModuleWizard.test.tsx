import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ModuleWizard from "@/pages/ModuleWizard";
import { ModuleLockedError } from "@/lib/modules/completeModule";

const completeModuleMock = vi.fn();
const refreshMock = vi.fn().mockResolvedValue(undefined);
const fetchNewlyUnlockedPathsMock = vi.fn();
const navigateMock = vi.fn();
const goBackMock = vi.fn();

let mockProfile: Record<string, unknown> = {};
let mockAvailabilityStatus: "available" | "locked" | "completed" | "refresh_available" = "available";
let mockStepKind: "intro" | "complete" = "complete";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/userProfile", () => ({
  useUserProfile: () => ({ profile: mockProfile, refresh: refreshMock }),
}));

vi.mock("@/lib/modules/moduleScheduler", async () => {
  const actual = await vi.importActual<typeof import("@/lib/modules/moduleScheduler")>(
    "@/lib/modules/moduleScheduler",
  );
  return {
    ...actual,
    getModuleAvailability: () => ({
      identity: { status: mockAvailabilityStatus, daysUntilUnlock: 0 },
      relational: { status: "available", daysUntilUnlock: 0 },
      history: { status: "available", daysUntilUnlock: 0 },
      financial: { status: "available", daysUntilUnlock: 0 },
      body: { status: "available", daysUntilUnlock: 0 },
      meaning: { status: "available", daysUntilUnlock: 0 },
    }),
  };
});

vi.mock("@/lib/modules/completeModule", async () => {
  const actual = await vi.importActual<typeof import("@/lib/modules/completeModule")>(
    "@/lib/modules/completeModule",
  );
  return {
    ...actual,
    completeModule: (...args: unknown[]) => completeModuleMock(...args),
  };
});

vi.mock("@/lib/modules/results/moduleUnlockedPaths", () => ({
  fetchNewlyUnlockedPaths: (...args: unknown[]) => fetchNewlyUnlockedPathsMock(...args),
}));

vi.mock("@/components/modules/useModuleWizard", () => ({
  useModuleWizard: () => ({
    questions: [],
    steps: [],
    stepIndex: 2,
    currentStep: { kind: mockStepKind },
    answers: {},
    goNext: vi.fn(),
    goBack: goBackMock,
    setAnswer: vi.fn(),
    toggleMultiSelect: vi.fn(),
    resetToIntro: vi.fn(),
    isFirstStep: false,
    isLastQuestionStep: false,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderWizard(slug = "identity") {
  return render(
    <MemoryRouter initialEntries={[`/settings/know-yourself/${slug}`]}>
      <Routes>
        <Route path="/settings/know-yourself/:moduleSlug" element={<ModuleWizard />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ModuleWizard results screen", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockProfile = {};
    mockAvailabilityStatus = "available";
    mockStepKind = "complete";
  });

  it("renders reflection sentences for the submitted answers once saved", async () => {
    completeModuleMock.mockResolvedValue(undefined);
    fetchNewlyUnlockedPathsMock.mockResolvedValue([]);
    mockProfile = { identitySelfWorthSource: "inherent" };

    renderWizard();

    await waitFor(() => expect(completeModuleMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByText(
          /Your sense of worth holds steady/,
        ),
      ).toBeInTheDocument(),
    );
  });

  it("shows a loading state and disables the finish CTA while submitting", async () => {
    let resolveComplete: () => void = () => {};
    completeModuleMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveComplete = resolve;
      }),
    );
    fetchNewlyUnlockedPathsMock.mockResolvedValue([]);
    mockProfile = {};

    renderWizard();

    await waitFor(() => expect(completeModuleMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    resolveComplete();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Back to profile/ })).not.toBeDisabled(),
    );
  });

  it("omits the unlocked-paths block when the resolver returns nothing", async () => {
    completeModuleMock.mockResolvedValue(undefined);
    fetchNewlyUnlockedPathsMock.mockResolvedValue([]);
    mockProfile = {};

    renderWizard();

    await waitFor(() => expect(completeModuleMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Back to profile/ })).toBeInTheDocument(),
    );
    expect(screen.queryByText("Newly unlocked paths")).not.toBeInTheDocument();
  });

  it("renders the full results screen with no error toast when fetchNewlyUnlockedPaths rejects", async () => {
    completeModuleMock.mockResolvedValue(undefined);
    fetchNewlyUnlockedPathsMock.mockRejectedValue(new Error("network down"));
    mockProfile = { identitySelfWorthSource: "inherent" };
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWizard();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Back to profile/ })).toBeInTheDocument(),
    );
    expect(screen.queryByText("Newly unlocked paths")).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("redirects to profile settings for an already-completed module", async () => {
    mockAvailabilityStatus = "completed";
    mockStepKind = "intro";
    mockProfile = {};

    renderWizard();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/settings?tab=profile", { replace: true }),
    );
  });

  it("returns the user to the last question via goBack on submit failure", async () => {
    completeModuleMock.mockRejectedValue(new Error("boom"));
    mockProfile = {};
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWizard();

    await waitFor(() => expect(goBackMock).toHaveBeenCalled());

    consoleErrorSpy.mockRestore();
  });

  it("navigates away and toasts on a locked-module submit error, without calling goBack", async () => {
    completeModuleMock.mockRejectedValue(new ModuleLockedError("Locked"));
    mockProfile = {};

    renderWizard();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/settings?tab=profile"),
    );
    expect(goBackMock).not.toHaveBeenCalled();
  });

  it("shows CrisisBar and no unlocks/path blocks on the History results step (MRS-04)", async () => {
    completeModuleMock.mockResolvedValue(undefined);
    fetchNewlyUnlockedPathsMock.mockResolvedValue([]);
    mockProfile = { traumaActivationLevel: "active" };

    renderWizard("history");

    await waitFor(() => expect(completeModuleMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Back to profile/ })).toBeInTheDocument(),
    );

    expect(screen.getByText(/In a crisis\? Call/i)).toBeInTheDocument();
    expect(screen.queryByText("What this unlocks")).not.toBeInTheDocument();
    expect(screen.queryByText("Newly unlocked paths")).not.toBeInTheDocument();
    expect(fetchNewlyUnlockedPathsMock).not.toHaveBeenCalled();
  });
});
