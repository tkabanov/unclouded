import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VOICE_MODE_LOCKED_HINT, parseVoiceMode } from "@/lib/realtime/realtimeUi";
import { VoiceModeToggle } from "./VoiceModeToggle";

function renderToggle(props: Partial<Parameters<typeof VoiceModeToggle>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <TooltipProvider>
      <VoiceModeToggle mode="messages" onChange={onChange} {...props} />
    </TooltipProvider>,
  );
  return onChange;
}

describe("VoiceModeToggle", () => {
  it("switches between Voice messages and Conversation", () => {
    const onChange = renderToggle();
    expect(screen.getByRole("radio", { name: "Voice messages" })).toHaveAttribute("data-state", "on");
    fireEvent.click(screen.getByRole("radio", { name: "Conversation" }));
    expect(onChange).toHaveBeenCalledWith("conversation");
  });

  it("ignores clicking the active mode", () => {
    const onChange = renderToggle({ mode: "conversation" });
    fireEvent.click(screen.getByRole("radio", { name: "Conversation" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is disabled with a hint during a session", () => {
    const onChange = renderToggle({ mode: "conversation", disabled: true });
    expect(screen.getByRole("radio", { name: "Voice messages" })).toBeDisabled();
    expect(screen.getByLabelText(VOICE_MODE_LOCKED_HINT)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Voice messages" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("routes a locked Conversation to the upsell hook", () => {
    const onLocked = vi.fn();
    const onChange = renderToggle({ conversationLocked: true, onConversationLocked: onLocked });
    fireEvent.click(screen.getByRole("radio", { name: "Conversation" }));
    expect(onLocked).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("parses the mode param with messages as default", () => {
    expect(parseVoiceMode("conversation")).toBe("conversation");
    expect(parseVoiceMode("messages")).toBe("messages");
    expect(parseVoiceMode(null)).toBe("messages");
    expect(parseVoiceMode("other")).toBe("messages");
  });
});
