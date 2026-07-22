import { describe, expect, it } from "vitest";

import { formatReferralSignUpCountMessage } from "./referralStatsApi";

describe("formatReferralSignUpCountMessage", () => {
  it("returns zero-state copy", () => {
    expect(formatReferralSignUpCountMessage(0)).toBe("No one has signed up with your link yet.");
  });

  it("returns singular copy", () => {
    expect(formatReferralSignUpCountMessage(1)).toBe("You've referred 1 person.");
  });

  it("returns plural copy", () => {
    expect(formatReferralSignUpCountMessage(3)).toBe("You've referred 3 people.");
  });
});
