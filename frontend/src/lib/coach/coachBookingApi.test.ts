import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  openExternalBookingUrl,
  requestOneOnOneBooking,
} from "@/lib/coach/coachBookingApi";
import { BOOKING_REDIRECT_ERROR } from "@/lib/subscription/subscriptionCopy";

const callRpc = vi.fn();

vi.mock("@/lib/supabase/rpc", () => ({
  callRpc: (...args: unknown[]) => callRpc(...args),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe("requestOneOnOneBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callRpc.mockImplementation(async (fn: string) => {
      if (fn === "request_one_on_one_booking") {
        return {
          data: { ok: true, bookingId: "booking-1", balance: 0, required: 2 },
          error: null,
        };
      }
      if (fn === "abort_my_one_on_one_booking_redirect") {
        return { data: { ok: true, released: 2, balance: 2 }, error: null };
      }
      return { data: null, error: new Error("unexpected rpc") };
    });
  });

  it("aborts the hold when window.open is blocked", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    const result = await requestOneOnOneBooking({
      externalCalendarUrl: "https://example.com/book",
    });

    expect(result).toEqual({
      status: "blocked",
      code: "redirect_failed",
      message: BOOKING_REDIRECT_ERROR,
      balance: 2,
    });
    expect(callRpc).toHaveBeenCalledTimes(2);
    expect(callRpc).toHaveBeenNthCalledWith(2, "abort_my_one_on_one_booking_redirect", {
      p_booking_id: "booking-1",
    });
  });

  it("does not abort when the calendar opens", async () => {
    vi.spyOn(window, "open").mockReturnValue({ opener: window } as Window);

    const result = await requestOneOnOneBooking({
      externalCalendarUrl: "https://example.com/book",
    });

    expect(result.status).toBe("ok");
    expect(callRpc).toHaveBeenCalledTimes(1);
    expect(callRpc).toHaveBeenCalledWith("request_one_on_one_booking", {
      p_scheduled_at: null,
    });
  });
});

describe("openExternalBookingUrl", () => {
  it("returns false when open returns null", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(openExternalBookingUrl("https://example.com")).toBe(false);
  });

  it("opens without noopener features and clears opener", () => {
    const child = { opener: window } as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(child);

    expect(openExternalBookingUrl("https://example.com/book")).toBe(true);
    expect(openSpy).toHaveBeenCalledWith("https://example.com/book", "_blank");
    expect(openSpy.mock.calls[0]?.length).toBe(2);
    expect(child.opener).toBeNull();
  });
});
