import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/aiInsights/aiInsightsConsentApi", () => ({
  fetchAiInsightsConsent: vi.fn(),
  setAiInsightsConsent: vi.fn(),
}));

import { toast } from "sonner";
import { AiInsightsConsentGate } from "@/components/aiInsights/AiInsightsConsentGate";
import { AI_INSIGHTS_CONSENT_COPY } from "@/lib/aiInsights/aiInsightsConsentCopy";
import {
  fetchAiInsightsConsent,
  setAiInsightsConsent,
} from "@/lib/aiInsights/aiInsightsConsentApi";

const fetchMock = vi.mocked(fetchAiInsightsConsent);
const setMock = vi.mocked(setAiInsightsConsent);

const NEEDS_PROMPT = {
  status: "loaded" as const,
  granted: null,
  version: null,
  updatedAt: null,
  needsPrompt: true,
};

function renderGate() {
  return render(
    <AiInsightsConsentGate>
      <div>AI panel</div>
    </AiInsightsConsentGate>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AiInsightsConsentGate (NCLDD-55)", () => {
  it.each([
    [false, AI_INSIGHTS_CONSENT_COPY.decline],
    [true, AI_INSIGHTS_CONSENT_COPY.allow],
  ])("opens the AI panel after either choice (granted=%s)", async (granted, label) => {
    fetchMock.mockResolvedValue(NEEDS_PROMPT);
    setMock.mockResolvedValue({ granted, version: 1, updatedAt: "2026-10-12T00:00:00Z" });

    renderGate();

    expect(await screen.findByText(AI_INSIGHTS_CONSENT_COPY.title)).toBeInTheDocument();
    // The panel must not mount (and fire its AI opener) before a choice exists.
    expect(screen.queryByText("AI panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(await screen.findByText("AI panel")).toBeInTheDocument();
    expect(setMock).toHaveBeenCalledWith(granted, "first_use");
  });

  it("does not prompt once the current version is answered", async () => {
    fetchMock.mockResolvedValue({
      status: "loaded",
      granted: false,
      version: 1,
      updatedAt: null,
      needsPrompt: false,
    });
    renderGate();
    expect(await screen.findByText("AI panel")).toBeInTheDocument();
    expect(screen.queryByText(AI_INSIGHTS_CONSENT_COPY.title)).not.toBeInTheDocument();
  });

  it("never blocks AI when consent storage is unavailable", async () => {
    fetchMock.mockResolvedValue({ status: "unavailable" });
    renderGate();
    expect(await screen.findByText("AI panel")).toBeInTheDocument();
  });

  it("keeps the prompt open when saving fails", async () => {
    fetchMock.mockResolvedValue(NEEDS_PROMPT);
    setMock.mockRejectedValue(new Error("Couldn't save your choice. Please try again."));

    renderGate();
    fireEvent.click(await screen.findByRole("button", { name: AI_INSIGHTS_CONSENT_COPY.allow }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText(AI_INSIGHTS_CONSENT_COPY.title)).toBeInTheDocument();
    expect(screen.queryByText("AI panel")).not.toBeInTheDocument();
  });
});
