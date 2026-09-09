import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ModuleResultsPage from "@/pages/ModuleResultsPage";

const navigateMock = vi.fn();
let mockProfile: Record<string, unknown> = {};
let mockAvailabilityStatus: "available" | "locked" | "completed" | "refresh_available" = "completed";

vi.mock("@/lib/userProfile", () => ({
  useUserProfile: () => ({ profile: mockProfile }),
}));

vi.mock("@/lib/modules/moduleScheduler", async () => {
  const actual = await vi.importActual<typeof import("@/lib/modules/moduleScheduler")>(
    "@/lib/modules/moduleScheduler",
  );
  return {
    ...actual,
    getModuleAvailability: () => ({
      identity: { status: mockAvailabilityStatus, daysUntilUnlock: 0 },
      relational: { status: mockAvailabilityStatus, daysUntilUnlock: 0 },
      history: { status: mockAvailabilityStatus, daysUntilUnlock: 0 },
      financial: { status: mockAvailabilityStatus, daysUntilUnlock: 0 },
      body: { status: mockAvailabilityStatus, daysUntilUnlock: 0 },
      meaning: { status: mockAvailabilityStatus, daysUntilUnlock: 0 },
    }),
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderPage(slug = "identity") {
  return render(
    <MemoryRouter initialEntries={[`/settings/know-yourself/${slug}/results`]}>
      <Routes>
        <Route path="/settings/know-yourself/:moduleSlug/results" element={<ModuleResultsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ModuleResultsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockProfile = {};
    mockAvailabilityStatus = "completed";
  });

  it("renders reflections for a completed module with no write of any kind", async () => {
    mockAvailabilityStatus = "completed";
    mockProfile = { identitySelfWorthSource: "inherent" };

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Your sense of worth holds steady/)).toBeInTheDocument(),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("redirects to profile settings for a locked module", async () => {
    mockAvailabilityStatus = "locked";
    mockProfile = {};

    renderPage();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/settings?tab=profile", { replace: true }),
    );
  });

  it("redirects rather than rendering an empty screen for an available (not yet taken) module", async () => {
    mockAvailabilityStatus = "available";
    mockProfile = {};

    renderPage();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/settings?tab=profile", { replace: true }),
    );
  });
});
