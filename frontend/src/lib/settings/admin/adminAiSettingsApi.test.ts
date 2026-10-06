import { describe, expect, it } from "vitest";
import { AI_SETTINGS_LIMITS, normalizeTopics } from "@/lib/settings/admin/adminAiSettingsApi";

describe("normalizeTopics", () => {
  it("trims, collapses whitespace and drops empties", () => {
    expect(normalizeTopics(["  politics ", "", "   ", "crypto\n  trading"])).toEqual([
      "politics",
      "crypto trading",
    ]);
  });

  it("dedupes case-insensitively keeping the first spelling", () => {
    expect(normalizeTopics(["Politics", "politics", "POLITICS", "religion"])).toEqual([
      "Politics",
      "religion",
    ]);
  });

  it("enforces count and length limits", () => {
    const many = Array.from({ length: AI_SETTINGS_LIMITS.topicCount + 5 }, (_, i) => `topic ${i}`);
    expect(normalizeTopics(many)).toHaveLength(AI_SETTINGS_LIMITS.topicCount);
    const long = "x".repeat(AI_SETTINGS_LIMITS.topicLength + 20);
    expect(normalizeTopics([long])[0]).toHaveLength(AI_SETTINGS_LIMITS.topicLength);
  });
});
