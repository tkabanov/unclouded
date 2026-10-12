import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatMessageFeedback } from "@/components/chat/ChatMessageFeedback";
import { ChatMessageCell } from "@/components/chat/ChatMessageCell";

describe("ChatMessageFeedback (NCLDD-55)", () => {
  it("rates a reply and reveals reason chips for that rating", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<ChatMessageFeedback feedback={null} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Not helpful" }));
    expect(onSubmit).toHaveBeenCalledWith(-1);

    rerender(<ChatMessageFeedback feedback={{ rating: -1, reasons: [] }} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Too generic" }));
    expect(onSubmit).toHaveBeenLastCalledWith(-1, ["too_generic"]);
    expect(screen.queryByRole("button", { name: "Helpful advice" })).not.toBeInTheDocument();
  });

  it("clears the rating when the active button is clicked again", () => {
    const onSubmit = vi.fn();
    render(<ChatMessageFeedback feedback={{ rating: 1, reasons: [] }} onSubmit={onSubmit} />);

    const up = screen.getByRole("button", { name: "Helpful" });
    expect(up).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(up);
    expect(onSubmit).toHaveBeenCalledWith(0);
  });
});

describe("ChatMessageCell feedback (NCLDD-55)", () => {
  it("shows controls only on assistant replies when enabled", () => {
    const feedback = { value: null, onSubmit: vi.fn() };
    const { rerender } = render(
      <ChatMessageCell message={{ id: "m1", role: "user", content: "hi" }} feedback={feedback} />,
    );
    expect(screen.queryByRole("button", { name: "Helpful" })).not.toBeInTheDocument();

    rerender(<ChatMessageCell message={{ id: "m2", role: "assistant", content: "hello" }} />);
    expect(screen.queryByRole("button", { name: "Helpful" })).not.toBeInTheDocument();

    rerender(
      <ChatMessageCell
        message={{ id: "m2", role: "assistant", content: "hello" }}
        feedback={feedback}
      />,
    );
    expect(screen.getByRole("button", { name: "Helpful" })).toBeInTheDocument();
  });
});
