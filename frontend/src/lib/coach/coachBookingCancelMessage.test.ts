import { describe, expect, it } from "vitest";

import { cancelToastMessage } from "./coachBookingCancelMessage";

const NOW = Date.parse("2026-10-14T12:00:00Z");

describe("cancelToastMessage", () => {
  it("confirms returned credits", () => {
    expect(cancelToastMessage(true, { scheduledAt: "2026-10-17T09:00:00Z" }, NOW)).toBe(
      "Session canceled — your credits were returned.",
    );
  });

  it("does not blame the 24h rule when the session is 24h+ away", () => {
    expect(cancelToastMessage(false, { scheduledAt: "2026-10-17T09:00:00Z" }, NOW)).toBe(
      "Session canceled. No credit was returned for this session.",
    );
  });

  it("explains the 24h rule for a late cancel", () => {
    expect(cancelToastMessage(false, { scheduledAt: "2026-10-14T20:00:00Z" }, NOW)).toBe(
      "Session canceled. Credits are not refunded within 24 hours of the session.",
    );
  });
});
