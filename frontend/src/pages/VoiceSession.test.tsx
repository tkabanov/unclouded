import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const fetchLatestUnfinishedVoiceConversation = vi.fn();
const createConversation = vi.fn();
const stopKotaSpeech = vi.fn();
let realtimeBusy = false;

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/aiInsights/AiInsightsConsentGate", () => ({
  AiInsightsConsentGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/userProfile", () => ({
  useUserProfile: () => ({ profile: { firstName: "Alex", tier: "free", subscribed: false }, refresh: vi.fn() }),
}));
vi.mock("@/lib/chat/chatConversationsApi", () => ({
  fetchLatestUnfinishedVoiceConversation: (...args: unknown[]) => fetchLatestUnfinishedVoiceConversation(...args),
  createConversation: (...args: unknown[]) => createConversation(...args),
}));
vi.mock("@/hooks/useVoiceSessionRecorder", () => ({ stopKotaSpeech: () => stopKotaSpeech() }));
vi.mock("@/components/voice/VoiceSessionPanel", () => ({
  default: ({ conversationId }: { conversationId: string }) => <div>Voice messages panel {conversationId}</div>,
}));
vi.mock("@/components/voice/realtime/RealtimeConversationPanel", async () => {
  const { useEffect } = await import("react");
  function MockRealtimeConversationPanel({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
    useEffect(() => onBusyChange?.(realtimeBusy), [onBusyChange]);
    return <div>Realtime conversation panel</div>;
  }
  return { default: MockRealtimeConversationPanel };
});

import VoiceSession from "./VoiceSession";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderAt(path: string) {
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/coaching/voice"
            element={
              <>
                <VoiceSession />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  fetchLatestUnfinishedVoiceConversation.mockReset().mockResolvedValue({ id: "voice-1" });
  createConversation.mockReset();
  stopKotaSpeech.mockReset();
  realtimeBusy = false;
});

describe("VoiceSession modes", () => {
  it("messages mode (default) keeps the OVR-057 resume flow", async () => {
    renderAt("/coaching/voice");
    expect(await screen.findByText("Voice messages panel voice-1")).toBeInTheDocument();
    expect(fetchLatestUnfinishedVoiceConversation).toHaveBeenCalledWith("user-1");
    expect(screen.getByRole("radio", { name: "Voice messages" })).toHaveAttribute("data-state", "on");
  });

  it("conversation mode skips the bootstrap and shows the realtime panel", async () => {
    renderAt("/coaching/voice?mode=conversation");
    expect(await screen.findByText("Realtime conversation panel")).toBeInTheDocument();
    expect(fetchLatestUnfinishedVoiceConversation).not.toHaveBeenCalled();
    expect(createConversation).not.toHaveBeenCalled();
  });

  it("switching modes stops Kota's speech and updates the URL", async () => {
    renderAt("/coaching/voice?id=voice-1");
    await screen.findByText("Voice messages panel voice-1");
    fireEvent.click(screen.getByRole("radio", { name: "Conversation" }));
    expect(stopKotaSpeech).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?mode=conversation"));
    expect(screen.getByText("Realtime conversation panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Voice messages" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?id=voice-1"));
  });

  it("locks the toggle while a realtime session is busy", async () => {
    realtimeBusy = true;
    renderAt("/coaching/voice?mode=conversation");
    await screen.findByText("Realtime conversation panel");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Voice messages" })).toBeDisabled());
  });
});
