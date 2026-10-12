import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/chat/aiMessageFeedbackApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/aiMessageFeedbackApi")>()),
  fetchConversationFeedback: vi.fn(),
  setAiMessageFeedback: vi.fn(),
}));

import { toast } from "sonner";
import { useAiMessageFeedback } from "@/hooks/useAiMessageFeedback";
import {
  canRateMessage,
  fetchConversationFeedback,
  setAiMessageFeedback,
} from "@/lib/chat/aiMessageFeedbackApi";

const MESSAGE_ID = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canRateMessage (NCLDD-55)", () => {
  it("allows only saved assistant replies", () => {
    expect(canRateMessage({ id: MESSAGE_ID, role: "assistant" })).toBe(true);
    expect(canRateMessage({ id: `pending-${MESSAGE_ID}`, role: "assistant" })).toBe(false);
    expect(canRateMessage({ id: MESSAGE_ID, role: "user" })).toBe(false);
  });
});

describe("useAiMessageFeedback (NCLDD-55)", () => {
  it("stays unavailable when feedback storage is missing", async () => {
    vi.mocked(fetchConversationFeedback).mockResolvedValue({ available: false });
    const { result } = renderHook(() => useAiMessageFeedback("c1"));
    await waitFor(() => expect(fetchConversationFeedback).toHaveBeenCalledWith("c1"));
    expect(result.current.available).toBe(false);
  });

  it("rolls back an optimistic rating when saving fails", async () => {
    vi.mocked(fetchConversationFeedback).mockResolvedValue({
      available: true,
      byMessageId: { [MESSAGE_ID]: { rating: 1, reasons: [] } },
    });
    vi.mocked(setAiMessageFeedback).mockRejectedValue(new Error("Couldn't save your feedback."));

    const { result } = renderHook(() => useAiMessageFeedback("c1"));
    await waitFor(() => expect(result.current.available).toBe(true));

    await act(async () => {
      await result.current.submit(MESSAGE_ID, -1);
    });

    expect(result.current.feedbackFor(MESSAGE_ID)).toEqual({ rating: 1, reasons: [] });
    expect(toast.error).toHaveBeenCalledWith("Couldn't save your feedback.");
  });
});
