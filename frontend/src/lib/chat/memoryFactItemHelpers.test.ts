import { describe, expect, it } from "vitest";
import {
  formatMemoryFactItemsForPrompt,
  mergeMemoryFactFieldWithDates,
  stampMemoryFactItem,
} from "../../../../supabase/functions/chat/sessionMemory/memoryFactItemHelpers.ts";

describe("memoryFactItemHelpers", () => {
  it("stamps undated items with a date key", () => {
    expect(stampMemoryFactItem("Partner: Jordan", "2026-07-20")).toBe(
      "2026-07-20|Partner: Jordan",
    );
  });

  it("merges incoming dated items ahead of existing facts", () => {
    const merged = mergeMemoryFactFieldWithDates(
      "2026-06-01|Manager: Sam",
      "Partner: Jordan",
      "2026-07-20",
    );
    expect(merged).toContain("2026-07-20|Partner: Jordan");
    expect(merged).toContain("2026-06-01|Manager: Sam");
  });

  it("formats dated items for Layer 10 prompt block", () => {
    const line = formatMemoryFactItemsForPrompt(
      "Named people",
      "2026-05-01|Partner: Jordan\n2026-07-20|Manager: Sam",
    );
    expect(line).toContain("2026-05-01 — Partner: Jordan");
    expect(line).toContain("2026-07-20 — Manager: Sam");
  });
});
