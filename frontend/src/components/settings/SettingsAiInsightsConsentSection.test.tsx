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
import { SettingsAiInsightsConsentSection } from "@/components/settings/SettingsAiInsightsConsentSection";
import {
  fetchAiInsightsConsent,
  setAiInsightsConsent,
} from "@/lib/aiInsights/aiInsightsConsentApi";

const fetchMock = vi.mocked(fetchAiInsightsConsent);
const setMock = vi.mocked(setAiInsightsConsent);

const loaded = (granted: boolean | null) => ({
  status: "loaded" as const,
  granted,
  version: granted === null ? null : 1,
  updatedAt: null,
  needsPrompt: granted === null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SettingsAiInsightsConsentSection (NCLDD-55)", () => {
  it("turns analysis on from Settings", async () => {
    fetchMock.mockResolvedValue(loaded(false));
    setMock.mockResolvedValue({ granted: true, version: 1, updatedAt: null });

    render(<SettingsAiInsightsConsentSection />);
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    fireEvent.click(toggle);

    await waitFor(() => expect(setMock).toHaveBeenCalledWith(true, "settings"));
    expect(await screen.findByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("asks for confirmation before turning analysis off", async () => {
    fetchMock.mockResolvedValue(loaded(true));
    setMock.mockResolvedValue({ granted: false, version: 1, updatedAt: null });

    render(<SettingsAiInsightsConsentSection />);
    fireEvent.click(await screen.findByRole("switch"));

    expect(await screen.findByText("Turn off anonymized analysis?")).toBeInTheDocument();
    expect(setMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));

    await waitFor(() => expect(setMock).toHaveBeenCalledWith(false, "settings"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("keeps the previous value when saving fails", async () => {
    fetchMock.mockResolvedValue(loaded(false));
    setMock.mockRejectedValue(new Error("Couldn't save your choice. Please try again."));

    render(<SettingsAiInsightsConsentSection />);
    fireEvent.click(await screen.findByRole("switch"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("is hidden when consent storage is unavailable", async () => {
    fetchMock.mockResolvedValue({ status: "unavailable" });
    const { container } = render(<SettingsAiInsightsConsentSection />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
