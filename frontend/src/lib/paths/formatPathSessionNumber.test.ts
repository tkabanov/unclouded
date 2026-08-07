import { describe, expect, it } from "vitest";
import { formatPathSessionNumber } from "../../../../supabase/functions/_shared/standalonePrompts/formatPathSessionNumber.ts";

describe("formatPathSessionNumber", () => {
  it("formats Session N of M when both are valid", () => {
    expect(formatPathSessionNumber(3, 6)).toBe("Session 3 of 6");
    expect(formatPathSessionNumber("2", "4")).toBe("Session 2 of 4");
  });

  it("omits of-clause when total is missing or invalid", () => {
    expect(formatPathSessionNumber(3)).toBe("Session 3");
    expect(formatPathSessionNumber(3, 0)).toBe("Session 3");
    expect(formatPathSessionNumber(3, null)).toBe("Session 3");
  });

  it("uses ? when index is missing", () => {
    expect(formatPathSessionNumber(null, 6)).toBe("Session ? of 6");
    expect(formatPathSessionNumber(undefined)).toBe("Session ?");
  });
});
