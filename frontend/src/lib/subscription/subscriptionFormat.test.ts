import { describe, expect, it } from "vitest";

import {
  endSentence,
  formatMoneyFromCents,
  formatSubscriptionDate,
} from "@/lib/subscription/subscriptionFormat";

describe("subscriptionFormat (OVR-075 fixed en-US locale)", () => {
  it("formats dates in en-US whatever the browser locale is", () => {
    expect(formatSubscriptionDate("2026-10-13T12:00:00Z")).toBe("October 13, 2026");
    expect(formatSubscriptionDate(null)).toBeNull();
    expect(formatSubscriptionDate("not a date")).toBeNull();
  });

  it("formats money in en-US", () => {
    expect(formatMoneyFromCents(0)).toBe("$0");
    expect(formatMoneyFromCents(870)).toBe("$8.70");
  });

  it("ends a sentence with exactly one period", () => {
    expect(endSentence("since October 13, 2026")).toBe("since October 13, 2026.");
    expect(endSentence("since 13 октября 2026 г.")).toBe("since 13 октября 2026 г.");
    expect(endSentence("")).toBe(".");
  });
});
