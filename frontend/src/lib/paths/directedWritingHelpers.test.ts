import { describe, expect, it } from "vitest";
import {
  assembleUnsentLetterContent,
  buildUnsentLetterSections,
  isDirectedWritingSubMode,
  isFinalDirectedWritingSession,
} from "./directedWritingHelpers";

describe("directedWritingHelpers", () => {
  it("detects directed_writing subMode", () => {
    expect(isDirectedWritingSubMode("directed_writing")).toBe(true);
    expect(isDirectedWritingSubMode("Directed_Writing")).toBe(true);
    expect(isDirectedWritingSubMode("coaching")).toBe(false);
  });

  it("identifies session 4 as the final directed-writing session", () => {
    expect(isFinalDirectedWritingSession(4)).toBe(true);
    expect(isFinalDirectedWritingSession(3)).toBe(false);
  });

  it("assembles letter sections in order", () => {
    const content = assembleUnsentLetterContent([
      { title: "Who is this letter to?", answerText: "To my younger self." },
      { title: "What has never been said?", answerText: "I never told you I was scared." },
    ]);

    expect(content).toContain("## Who is this letter to?");
    expect(content).toContain("To my younger self.");
    expect(content).toContain("I never told you I was scared.");
  });

  it("merges prior answers with the current session answer", () => {
    const sections = buildUnsentLetterSections(
      [
        { id: "s1", index: 1, title: "Session 1", coachingText: "", microCommitment: "" },
        { id: "s2", index: 2, title: "Session 2", coachingText: "", microCommitment: "" },
      ],
      new Map([["s1", "Draft line one."]]),
      "s2",
      "Draft line two.",
    );

    expect(sections).toEqual([
      { title: "Session 1", answerText: "Draft line one." },
      { title: "Session 2", answerText: "Draft line two." },
    ]);
  });
});
