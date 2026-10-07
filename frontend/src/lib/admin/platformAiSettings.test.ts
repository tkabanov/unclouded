import { describe, expect, it, vi } from "vitest";
import {
  buildBasePromptBlock,
  buildPlatformRulesBlock,
  buildToneBlock,
  clearPlatformAiSettingsCache,
  EMPTY_PLATFORM_AI_SETTINGS,
  loadPlatformAiSettings,
  normalizePlatformAiSettingsRow,
  PLATFORM_RULES_HEADER,
  TONE_OF_VOICE_HEADER,
  withPlatformSettings,
} from "../../../../supabase/functions/_shared/platformAiSettings.ts";

describe("platform AI settings prompt builders (NCLDD-53)", () => {
  it("return null for empty settings", () => {
    expect(buildPlatformRulesBlock(EMPTY_PLATFORM_AI_SETTINGS)).toBeNull();
    expect(buildToneBlock(EMPTY_PLATFORM_AI_SETTINGS)).toBeNull();
    expect(buildPlatformRulesBlock(null)).toBeNull();
    expect(buildToneBlock(undefined)).toBeNull();
    expect(withPlatformSettings("SYSTEM", EMPTY_PLATFORM_AI_SETTINGS)).toBe("SYSTEM");
  });

  it("renders topics as bullet lines and ignores the global prompt (chat base only)", () => {
    const block = buildPlatformRulesBlock({
      globalSystemPrompt: "Be brief.",
      prohibitedTopics: ["politics", "  crypto\n trading  ", ""],
      toneOfVoice: "",
    });
    expect(block).not.toBeNull();
    expect(block!.startsWith(PLATFORM_RULES_HEADER)).toBe(true);
    expect(block).toContain("- politics\n- crypto trading");
    expect(block).not.toContain("Be brief.");
    expect(block).not.toMatch(/^- $/m);
  });

  it("returns null rules and the trimmed base for a global prompt without topics", () => {
    const settings = { globalSystemPrompt: "  Base.  ", prohibitedTopics: [], toneOfVoice: "" };
    expect(buildPlatformRulesBlock(settings)).toBeNull();
    expect(buildBasePromptBlock(settings)).toBe("Base.");
    expect(buildBasePromptBlock(EMPTY_PLATFORM_AI_SETTINGS)).toBeNull();
    expect(withPlatformSettings("SYSTEM", settings)).toBe("SYSTEM");
  });

  it("tone block is framed as style only and keeps output format", () => {
    const block = buildToneBlock({ globalSystemPrompt: "", prohibitedTopics: [], toneOfVoice: "Warm." });
    expect(block!.startsWith(TONE_OF_VOICE_HEADER)).toBe(true);
    expect(block).toContain("Keep any required output format.");
  });

  it("withPlatformSettings orders rules → original → tone", () => {
    const wrapped = withPlatformSettings("ORIGINAL SYSTEM", {
      globalSystemPrompt: "Rule.",
      prohibitedTopics: ["politics"],
      toneOfVoice: "Warm.",
    });
    const rules = wrapped.indexOf(PLATFORM_RULES_HEADER);
    const original = wrapped.indexOf("ORIGINAL SYSTEM");
    const tone = wrapped.indexOf(TONE_OF_VOICE_HEADER);
    expect(rules).toBe(0);
    expect(original).toBeGreaterThan(rules);
    expect(tone).toBeGreaterThan(original);
  });

  it("normalizes unknown rows to empty settings", () => {
    expect(normalizePlatformAiSettingsRow(null)).toEqual(EMPTY_PLATFORM_AI_SETTINGS);
    expect(
      normalizePlatformAiSettingsRow({ globalSystemPrompt: 1, prohibitedTopics: ["a", 2], toneOfVoice: "t" }),
    ).toEqual({ globalSystemPrompt: "", prohibitedTopics: ["a"], toneOfVoice: "t" });
  });
});

describe("loadPlatformAiSettings", () => {
  function clientReturning(result: { data?: unknown; error?: { code?: string; message?: string } | null }) {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: result.data ?? null, error: result.error ?? null }),
    };
    return { from: () => query } as never;
  }

  it("falls back to empty settings on error with no cache", async () => {
    clearPlatformAiSettingsCache();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      loadPlatformAiSettings(clientReturning({ error: { code: "42P01" } })),
    ).resolves.toEqual(EMPTY_PLATFORM_AI_SETTINGS);
    warn.mockRestore();
  });

  it("keeps the last good settings when a later load fails", async () => {
    vi.useFakeTimers();
    clearPlatformAiSettingsCache();
    const good = { globalSystemPrompt: "Rule.", prohibitedTopics: ["politics"], toneOfVoice: "" };
    await loadPlatformAiSettings(clientReturning({ data: good }));
    vi.advanceTimersByTime(61_000);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      loadPlatformAiSettings(() => {
        throw new Error("network");
      }),
    ).resolves.toEqual(good);
    warn.mockRestore();
    vi.useRealTimers();
    clearPlatformAiSettingsCache();
  });
});
