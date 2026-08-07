import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  JOURNAL_REFLECTION_PENDING_REVEAL_KEY,
  clearJournalReflectionPendingReveals,
  isJournalReflectionRevealPending,
  markJournalReflectionPendingReveal,
  shouldShowJournalReflection,
} from "@/lib/journal/journalReflectionReveal";

describe("journalReflectionReveal", () => {
  beforeEach(() => {
    clearJournalReflectionPendingReveals();
  });

  afterEach(() => {
    clearJournalReflectionPendingReveals();
  });

  it("marks, checks, and clears pending reveal ids", () => {
    expect(isJournalReflectionRevealPending("entry-1")).toBe(false);
    markJournalReflectionPendingReveal("entry-1");
    expect(isJournalReflectionRevealPending("entry-1")).toBe(true);
    expect(isJournalReflectionRevealPending("entry-2")).toBe(false);
    markJournalReflectionPendingReveal("entry-2");
    expect(isJournalReflectionRevealPending("entry-2")).toBe(true);
    clearJournalReflectionPendingReveals();
    expect(isJournalReflectionRevealPending("entry-1")).toBe(false);
    expect(sessionStorage.getItem(JOURNAL_REFLECTION_PENDING_REVEAL_KEY)).toBeNull();
  });

  it("does not duplicate the same entry id", () => {
    markJournalReflectionPendingReveal("entry-1");
    markJournalReflectionPendingReveal("entry-1");
    expect(JSON.parse(sessionStorage.getItem(JOURNAL_REFLECTION_PENDING_REVEAL_KEY) ?? "[]")).toEqual([
      "entry-1",
    ]);
  });

  it("shouldShowJournalReflection respects pending and ready state", () => {
    const ready = {
      id: "entry-1",
      reflectionReady: true,
      aiReflection: "Something worth sitting with.",
      has_ai_reflection: true,
    };
    expect(shouldShowJournalReflection(ready)).toBe(true);
    markJournalReflectionPendingReveal("entry-1");
    expect(shouldShowJournalReflection(ready)).toBe(false);
    clearJournalReflectionPendingReveals();
    expect(shouldShowJournalReflection(ready)).toBe(true);
    expect(
      shouldShowJournalReflection({
        id: "entry-2",
        reflectionReady: false,
        aiReflection: null,
        has_ai_reflection: false,
      }),
    ).toBe(false);
  });

  it("swallows sessionStorage failures", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => markJournalReflectionPendingReveal("entry-1")).not.toThrow();
    expect(isJournalReflectionRevealPending("entry-1")).toBe(false);
    expect(() => clearJournalReflectionPendingReveals()).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
    removeItem.mockRestore();
  });
});
