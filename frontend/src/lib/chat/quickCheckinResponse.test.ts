import { describe, expect, it } from "vitest";
import {
  enforceQuickCheckinResponse,
  quickCheckinResponseViolatesRules,
} from "../../../../supabase/functions/chat/quickCheckinResponse.ts";

describe("quickCheckinResponse", () => {
  it("keeps only the first sentence and strips questions", () => {
    expect(
      enforceQuickCheckinResponse("That sounds heavy. What do you want to explore today?"),
    ).toBe("That sounds heavy.");
  });

  it("flags multi-sentence or question responses", () => {
    expect(quickCheckinResponseViolatesRules("I hear you. How are you feeling?")).toBe(true);
    expect(quickCheckinResponseViolatesRules("That makes sense.")).toBe(false);
  });
});
