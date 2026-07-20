import { describe, expect, it } from "vitest";
import {
  estimatePromptTokens,
  shouldCompressContext,
} from "../../../../supabase/functions/chat/tokenEstimate.ts";

describe("tokenEstimate", () => {
  it("estimates tokens from character length", () => {
    expect(estimatePromptTokens("abcd")).toBe(1);
    expect(estimatePromptTokens("a".repeat(8000))).toBe(2000);
  });

  it("flags compression at the 6000-token default limit", () => {
    expect(shouldCompressContext(5999)).toBe(false);
    expect(shouldCompressContext(6000)).toBe(true);
    expect(shouldCompressContext(7000)).toBe(true);
  });
});
