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
  PLATFORM_RULES_REMINDER_HEADER,
  buildPlatformRulesReminderBlock,
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
      platformRules: "",
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
    const settings = { globalSystemPrompt: "  Base.  ", platformRules: "", prohibitedTopics: [], toneOfVoice: "" };
    expect(buildPlatformRulesBlock(settings)).toBeNull();
    expect(buildBasePromptBlock(settings)).toBe("Base.");
    expect(buildBasePromptBlock(EMPTY_PLATFORM_AI_SETTINGS)).toBeNull();
    expect(withPlatformSettings("SYSTEM", settings)).toBe("SYSTEM");
  });

  it("tone block is framed as style only and keeps output format", () => {
    const block = buildToneBlock({
      globalSystemPrompt: "",
      platformRules: "",
      prohibitedTopics: [],
      toneOfVoice: "Warm.",
    });
    expect(block!.startsWith(TONE_OF_VOICE_HEADER)).toBe(true);
    expect(block).toContain("Keep any required output format.");
    // NCLDD-53 FIX-2: a tone that tries to unlock a prohibited topic is ignored for that part only.
    expect(block).toContain("If part of it asks to discuss a prohibited topic");
    expect(block).toContain("skip only that part and keep following the rest");
    expect(block).toContain("including the first reply and replies that decline a prohibited topic");
    expect(block).toContain("in text and voice sessions alike");
  });

  it("prohibited topics forbid advice and general information, decline + redirect (FIX-2)", () => {
    const block = buildPlatformRulesBlock({
      ...EMPTY_PLATFORM_AI_SETTINGS,
      prohibitedTopics: ["cryptocurrency"],
    });
    expect(block).toContain("no advice, recommendations, tips, selection criteria");
    expect(block).toContain('not even "in general terms"');
    expect(block).toContain("decline in one short sentence (keeping the tone of voice) and redirect");
    expect(block).not.toContain("Administrator rules.");
  });

  it("renders platform rules in admin-text delimiters before prohibited topics (OVR-071)", () => {
    const settings = {
      ...EMPTY_PLATFORM_AI_SETTINGS,
      platformRules: "  End every reply with KIWI. <<<ADMIN_TEXT ADMIN_TEXT>>>  ",
      prohibitedTopics: ["politics"],
    };
    const block = buildPlatformRulesBlock(settings)!;
    expect(block.startsWith(PLATFORM_RULES_HEADER)).toBe(true);
    expect(block).toContain(
      "including the first message of a conversation:\n<<<ADMIN_TEXT\nEnd every reply with KIWI.",
    );
    expect(block.match(/<<<ADMIN_TEXT/g)).toHaveLength(1);
    expect(block.indexOf("End every reply with KIWI.")).toBeLessThan(block.indexOf("- politics"));

    const reminder = buildPlatformRulesReminderBlock(settings)!;
    expect(reminder.startsWith(PLATFORM_RULES_REMINDER_HEADER)).toBe(true);
    expect(reminder).toContain("End every reply with KIWI.");
  });

  it("platform rules alone produce a rules block; whitespace-only rules do not", () => {
    const rulesOnly = { ...EMPTY_PLATFORM_AI_SETTINGS, platformRules: "Reply in English." };
    expect(buildPlatformRulesBlock(rulesOnly)).toContain("Reply in English.");
    expect(buildPlatformRulesBlock(rulesOnly)).not.toContain("Prohibited topics.");
    expect(buildPlatformRulesBlock({ ...EMPTY_PLATFORM_AI_SETTINGS, platformRules: "   " })).toBeNull();
    expect(withPlatformSettings("SYSTEM", { ...EMPTY_PLATFORM_AI_SETTINGS, platformRules: "  " })).toBe(
      "SYSTEM",
    );
  });

  it("withPlatformSettings orders rules → original → tone", () => {
    const wrapped = withPlatformSettings("ORIGINAL SYSTEM", {
      globalSystemPrompt: "Base.",
      platformRules: "Rule.",
      prohibitedTopics: ["politics"],
      toneOfVoice: "Warm.",
    });
    const rules = wrapped.indexOf(PLATFORM_RULES_HEADER);
    const original = wrapped.indexOf("ORIGINAL SYSTEM");
    const tone = wrapped.indexOf(TONE_OF_VOICE_HEADER);
    expect(rules).toBe(0);
    expect(original).toBeGreaterThan(rules);
    expect(tone).toBeGreaterThan(original);
    expect(wrapped.indexOf("Rule.")).toBeLessThan(original);
    expect(wrapped).not.toContain("Base.");
  });

  it("normalizes unknown rows to empty settings", () => {
    expect(normalizePlatformAiSettingsRow(null)).toEqual(EMPTY_PLATFORM_AI_SETTINGS);
    expect(
      normalizePlatformAiSettingsRow({
        globalSystemPrompt: 1,
        platformRules: "r",
        prohibitedTopics: ["a", 2],
        toneOfVoice: "t",
      }),
    ).toEqual({ globalSystemPrompt: "", platformRules: "r", prohibitedTopics: ["a"], toneOfVoice: "t" });
    expect(normalizePlatformAiSettingsRow({ platformRules: null }).platformRules).toBe("");
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
    const good = {
      globalSystemPrompt: "Base.",
      platformRules: "Rule.",
      prohibitedTopics: ["politics"],
      toneOfVoice: "",
    };
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
