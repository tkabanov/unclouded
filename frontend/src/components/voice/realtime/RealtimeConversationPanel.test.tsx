import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatMonthlyAiLimitMessage } from "@/lib/chat/chatSessionLimit";
import { INITIAL_REALTIME_SESSION_STATE, type RealtimeSessionState } from "@/lib/realtime/realtimeSessionMachine";
import type { UseRealtimeConversationResult } from "@/hooks/useRealtimeConversation";
import { REALTIME_OFFLINE_MESSAGE } from "@/lib/realtime/realtimeErrors";
import { REALTIME_TIME_WARNING_MESSAGE, REALTIME_VOICE_LOCKED_HINT, formatRemaining } from "@/lib/realtime/realtimeUi";

let hook: UseRealtimeConversationResult;
vi.mock("@/hooks/useRealtimeConversation", () => ({
  useRealtimeConversation: () => hook,
}));

import RealtimeConversationPanel from "./RealtimeConversationPanel";
import { RealtimeTranscript } from "./RealtimeTranscript";
import { RealtimeOrb } from "./RealtimeOrb";

function makeHook(state: Partial<RealtimeSessionState> = {}, extra: Partial<UseRealtimeConversationResult> = {}) {
  return {
    state: { ...INITIAL_REALTIME_SESSION_STATE, ...state },
    transcript: [],
    conversationId: null,
    remainingMs: null,
    timeWarning: false,
    playbackBlocked: false,
    crisis: null,
    error: null,
    endMessage: null,
    canRetry: false,
    level: 0,
    start: vi.fn(),
    end: vi.fn(),
    retry: vi.fn(),
    resumePlayback: vi.fn(),
    ...extra,
  } as UseRealtimeConversationResult;
}

function renderPanel(onBusyChange = vi.fn()) {
  render(
    <TooltipProvider>
      <RealtimeConversationPanel onBusyChange={onBusyChange} />
    </TooltipProvider>,
  );
  return onBusyChange;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RealtimeConversationPanel", () => {
  it("pre-start: voice picker and Start conversation with the stored voice", () => {
    window.localStorage.setItem("unclouded.realtimeVoice", "cedar");
    hook = makeHook();
    const onBusy = renderPanel();
    expect(screen.getByText("Ready when you are")).toBeInTheDocument();
    expect(screen.getByLabelText("Kota's voice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End conversation" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    expect(hook.start).toHaveBeenCalledWith("cedar", null);
    expect(onBusy).toHaveBeenLastCalledWith(false);
  });

  it("offline: Start disabled with the offline hint", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    hook = makeHook();
    renderPanel();
    expect(screen.getByRole("button", { name: "Start conversation" })).toBeDisabled();
    expect(screen.getByText(REALTIME_OFFLINE_MESSAGE)).toBeInTheDocument();
  });

  it("connecting: End conversation, picker locked, busy reported", () => {
    hook = makeHook({ phase: "connecting" });
    const onBusy = renderPanel();
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(REALTIME_VOICE_LOCKED_HINT))).toBeInTheDocument();
    expect(screen.queryByLabelText("Kota's voice")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "End conversation" }));
    expect(hook.end).toHaveBeenCalled();
    expect(onBusy).toHaveBeenLastCalledWith(true);
  });

  it("live: status, remaining time, warning, transcript", () => {
    hook = makeHook(
      { phase: "speaking", hasSession: true },
      {
        remainingMs: 4 * 60_000 + 5_000,
        timeWarning: true,
        transcript: [
          { itemId: "u1", role: "user", text: "I feel stuck", final: true, failed: false, interrupted: false },
          { itemId: "a1", role: "assistant", text: "Tell me", final: false, failed: false, interrupted: true },
        ],
      },
    );
    renderPanel();
    expect(screen.getByText("Kota is speaking")).toBeInTheDocument();
    expect(screen.getByText("4:05 left")).toBeInTheDocument();
    expect(screen.getByText(REALTIME_TIME_WARNING_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText("I feel stuck")).toBeInTheDocument();
    expect(screen.getByText("(interrupted)")).toBeInTheDocument();
  });

  it("reports not busy on unmount", () => {
    hook = makeHook({ phase: "listening", hasSession: true });
    const onBusy = vi.fn();
    const { unmount } = render(
      <TooltipProvider>
        <RealtimeConversationPanel onBusyChange={onBusy} />
      </TooltipProvider>,
    );
    expect(onBusy).toHaveBeenLastCalledWith(true);
    unmount();
    expect(onBusy).toHaveBeenLastCalledWith(false);
  });

  it("ending: End conversation disabled", () => {
    hook = makeHook({ phase: "ending", hasSession: true, endReason: "user_ended" });
    renderPanel();
    expect(screen.getByRole("button", { name: "End conversation" })).toBeDisabled();
  });

  it("autoplay blocked: Tap to enable sound", () => {
    hook = makeHook({ phase: "listening", hasSession: true }, { playbackBlocked: true });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Tap to enable sound/ }));
    expect(hook.resumePlayback).toHaveBeenCalled();
  });

  it("mic error: message and Try again (new start)", () => {
    hook = makeHook(
      { phase: "error", error: { kind: "mic_denied", code: "NotAllowedError" } },
      { error: { kind: "mic_denied", code: "NotAllowedError", message: "Microphone access is blocked." } },
    );
    renderPanel();
    expect(screen.getByRole("alert")).toHaveTextContent("Microphone access is blocked.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(hook.start).toHaveBeenCalledWith("marin", null);
  });

  it("limit: banner like voice messages and Start disabled", () => {
    const message = formatMonthlyAiLimitMessage("voice");
    hook = makeHook(
      { phase: "error", error: { kind: "limit_reached", code: "ai_monthly_limit_reached" } },
      { error: { kind: "limit_reached", code: "ai_monthly_limit_reached", message } },
    );
    renderPanel();
    expect(screen.getAllByText(message)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Start new conversation" })).toBeDisabled();
  });

  it("budget reached mid-session: banner and Start disabled", () => {
    const message = formatMonthlyAiLimitMessage("voice");
    hook = makeHook({ phase: "ended", hasSession: true, endReason: "budget_reached" }, { endMessage: message });
    renderPanel();
    expect(screen.getAllByText(message)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Start new conversation" })).toBeDisabled();
  });

  it("network lost: end message, Try again (retry) and Start new conversation", () => {
    hook = makeHook(
      { phase: "ended", hasSession: true, endReason: "network_lost" },
      { endMessage: "The connection was lost. Your transcript is saved.", canRetry: true, conversationId: "c1" },
    );
    renderPanel();
    expect(screen.getByRole("alert")).toHaveTextContent("The connection was lost");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(hook.retry).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start new conversation" }));
    expect(hook.start).toHaveBeenCalledWith("marin", null);
  });

  it("max duration: info notice and Start new conversation", () => {
    hook = makeHook(
      { phase: "ended", hasSession: true, endReason: "max_duration" },
      { endMessage: "This conversation reached the 60-minute limit." },
    );
    renderPanel();
    expect(screen.getByText("This conversation reached the 60-minute limit.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByRole("button", { name: "Start new conversation" })).toBeEnabled();
  });

  it("crisis: shows the crisis text and blocks restart", () => {
    hook = makeHook(
      { phase: "ended", hasSession: true, endReason: "crisis" },
      { crisis: { level: 3, text: "Please call or text 988." } },
    );
    renderPanel();
    expect(screen.getByRole("alert")).toHaveTextContent("Please call or text 988.");
    expect(screen.getByRole("button", { name: "Start new conversation" })).toBeDisabled();
  });

  it("stores a newly picked voice", () => {
    hook = makeHook();
    renderPanel();
    expect(screen.getByLabelText("Kota's voice")).toHaveTextContent("Marin (recommended)");
  });
});

describe("RealtimeTranscript", () => {
  it("shows a placeholder when empty and [inaudible] for failed items", () => {
    const { rerender } = render(<RealtimeTranscript items={[]} />);
    expect(screen.getByText("The transcript will appear here.")).toBeInTheDocument();
    rerender(
      <RealtimeTranscript
        items={[
          { itemId: "u1", role: "user", text: "", final: true, failed: true, interrupted: false },
          { itemId: "a1", role: "assistant", text: "", final: false, failed: false, interrupted: false },
        ]}
      />,
    );
    expect(screen.getByText("[inaudible]")).toBeInTheDocument();
    expect(screen.getByText("…")).toBeInTheDocument();
  });
});

describe("RealtimeOrb", () => {
  it.each([
    ["connecting", "connecting"],
    ["listening", "listening"],
    ["user_speaking", "user"],
    ["thinking", "thinking"],
    ["speaking", "speaking"],
    ["error", "off"],
    ["idle", "idle"],
  ] as const)("%s uses the %s visual", (phase, visual) => {
    render(<RealtimeOrb phase={phase} level={0.5} />);
    expect(screen.getByTestId("realtime-orb")).toHaveAttribute("data-visual", visual);
    expect(screen.getByRole("status")).toHaveTextContent(/\S/);
  });

  it("formats remaining time", () => {
    expect(formatRemaining(0)).toBe("0:00");
    expect(formatRemaining(61_001)).toBe("1:02");
    expect(formatRemaining(-5)).toBe("0:00");
  });
});
