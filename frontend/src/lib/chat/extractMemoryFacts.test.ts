import { describe, expect, it } from "vitest";
import { buildSessionTranscript } from "../../../../supabase/functions/chat/crisisDetect.ts";
import { mergeMemoryFactField } from "../../../../supabase/functions/chat/extractMemoryFacts.ts";
import type { UIMessage } from "ai";

describe("buildSessionTranscript", () => {
  it("includes User and Kota turns in order", () => {
    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "[SESSION START]" }] },
      { id: "2", role: "user", parts: [{ type: "text", text: "My manager Sam keeps piling things on." }] },
      {
        id: "3",
        role: "assistant",
        parts: [{ type: "text", text: "What does that cost you day to day?" }],
      },
      {
        id: "4",
        role: "user",
        parts: [{ type: "text", text: "I am just tired of performing okayness." }],
      },
    ];

    expect(buildSessionTranscript(messages)).toBe(
      [
        "User: My manager Sam keeps piling things on.",
        "Kota: What does that cost you day to day?",
        "User: I am just tired of performing okayness.",
      ].join("\n\n"),
    );
  });

  it("skips non-dialogue roles and empty messages", () => {
    const messages: UIMessage[] = [
      { id: "1", role: "system", parts: [{ type: "text", text: "hidden" }] },
      { id: "2", role: "user", parts: [{ type: "text", text: "   " }] },
      { id: "3", role: "assistant", parts: [{ type: "text", text: "Still here." }] },
    ];

    expect(buildSessionTranscript(messages)).toBe("Kota: Still here.");
  });
});

describe("mergeMemoryFactField (REQ-01)", () => {
  it("prefers newly extracted items and keeps up to 5 total", () => {
    const existing = [
      "Partner: Jordan",
      "Manager: Sam",
      "Child: Alex (8)",
      "Parent: Mom",
      "Friend: Lee",
    ].join("\n");
    const incoming = "Partner: Jordan\nManager: Taylor";

    const merged = mergeMemoryFactField(existing, incoming);
    expect(merged).toBe(
      [
        "Manager: Taylor",
        "Partner: Jordan",
        "Manager: Sam",
        "Child: Alex (8)",
        "Parent: Mom",
      ].join("\n"),
    );
  });

  it("dedupes case-insensitively and preserves existing when nothing new arrives", () => {
    const existing = "I am just tired\nI can't keep doing this";
    expect(mergeMemoryFactField(existing, null)).toBe(existing);
    expect(mergeMemoryFactField(existing, "I AM JUST TIRED")).toBe(existing);
  });

  it("returns null when both sides are empty", () => {
    expect(mergeMemoryFactField(null, null)).toBeNull();
    expect(mergeMemoryFactField("", "")).toBeNull();
  });
});
