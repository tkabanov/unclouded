import { describe, expect, it } from "vitest";
import { parseDailyInsights } from "../../../../supabase/functions/_shared/standalonePrompts/dailyInsights.ts";
import {
  buildPathClosingPrompt,
  parsePathClosing,
} from "../../../../supabase/functions/_shared/standalonePrompts/pathClosing.ts";
import { parseCoachingSummary } from "../../../../supabase/functions/_shared/standalonePrompts/coachingSummary.ts";
import { recentThemesFromSessionMemory } from "../../../../supabase/functions/_shared/standalonePrompts/context.ts";
import {
  dailyInsightPruneBeforeDate,
  dailyInsightsRetryDelayMs,
  preferredInsightHour,
  shouldGenerateDailyInsights,
} from "../../../../supabase/functions/_shared/standalonePrompts/dailyInsightsSchedule.ts";
import {
  formatKotaReadBrief,
  parseKotaReadBrief,
  buildKotaReadUserPrompt,
} from "../../../../supabase/functions/_shared/kotaReadBrief.ts";

describe("standalone prompt parsers", () => {
  it("parses daily insights JSON", () => {
    const parsed = parseDailyInsights({
      insight_1: { title: "Quiet Strength", body: "Paragraph one.\n\nParagraph two." },
      insight_2: { title: "The Cost", body: "Body two." },
      insight_3: { title: "Next Edge", body: "Body three." },
    });
    expect(parsed?.insight_1.title).toBe("Quiet Strength");
    expect(parsed?.insight_3.body).toContain("Body three");
  });

  it("parses path closing JSON", () => {
    const parsed = parsePathClosing({
      acknowledgment: "You named the weight under the performance.",
      sit_with: "That naming is the real work of this session.",
      cta_text: "Something come up? Start a chat with Kota.",
    });
    expect(parsed?.acknowledgment).toContain("weight");
    expect(parsed?.cta_text).toContain("Kota");
  });

  it("builds path closing prompt with tone adjustments and stay-with guidance", () => {
    const { prompt } = buildPathClosingPrompt({
      pathName: "Hard Seasons",
      sessionNumber: "Session 3 of 6",
      sessionTheme: "Naming the load",
      reflectionResponses: "Q: What landed?\nA: The weight I keep carrying.",
      classification: "High Output Hidden Instability",
      coachingMode: "Stabilizer",
      activeFlags: "none",
    });
    expect(prompt).toContain("TONE ADJUSTMENTS");
    expect(prompt).toContain("not dissolve when they close the app");
    expect(prompt).toContain("If coaching_mode = Rebuilder");
    expect(prompt).toContain("If coaching_mode = Stabilizer");
    expect(prompt).toContain("If coaching_mode = Builder");
    expect(prompt).toContain("If coaching_mode = Optimizer");
    expect(prompt).toContain("If grief_mode or recovery_mode is active");
  });

  it("parses coaching summary five sections", () => {
    const parsed = parseCoachingSummary({
      section_1_title: "Where You Started",
      section_1_body: "Start body",
      section_2_title: "What Moved",
      section_2_body: "Moved body",
      section_3_title: "What Came Up",
      section_3_body: "Themes body",
      section_4_title: "What the Data Reveals",
      section_4_body: "Reveal body",
      section_5_title: "The Next Chapter",
      section_5_body: "Next body",
    });
    expect(parsed?.section_5_body).toBe("Next body");
  });
});

describe("Prompt 1 recent_themes", () => {
  it("returns none with fewer than 2 sessions", () => {
    expect(recentThemesFromSessionMemory([])).toBe("none");
    expect(
      recentThemesFromSessionMemory([{ topic: "Only one", summaryStub: "Stub" }]),
    ).toBe("none");
  });

  it("takes up to 3 themes from the last 2 session summaries", () => {
    const themes = recentThemesFromSessionMemory([
      { topic: "Old", summaryStub: "ignored" },
      { topic: "Boundaries", summaryStub: "Named overload" },
      { topic: "", summaryStub: "Sleep debt" },
      { topic: "Fourth would be trimmed if mapped", summaryStub: "x" },
    ]);
    // last 2 only
    expect(themes).toBe("Sleep debt, Fourth would be trimmed if mapped");
  });
});

describe("Prompt 1 schedule gate", () => {
  it("defaults preferred hour to 8", () => {
    expect(preferredInsightHour(null)).toBe(8);
    expect(preferredInsightHour({ preferredInsightHour: 14 })).toBe(14);
  });

  it("runs at preferred hour once, then defers to retryAt", () => {
    expect(
      shouldGenerateDailyInsights({
        localHour: 8,
        preferredHour: 8,
        hasInsightToday: false,
        retry: null,
      }),
    ).toEqual({ run: true, isRetry: false });

    const retryAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    expect(
      shouldGenerateDailyInsights({
        localHour: 8,
        preferredHour: 8,
        hasInsightToday: false,
        retry: { attemptCount: 1, retryAt },
        nowMs: Date.now(),
      }),
    ).toEqual({ run: false, isRetry: false });

    expect(
      shouldGenerateDailyInsights({
        localHour: 9,
        preferredHour: 8,
        hasInsightToday: false,
        retry: { attemptCount: 1, retryAt: new Date(Date.now() - 1000).toISOString() },
        nowMs: Date.now(),
      }),
    ).toEqual({ run: true, isRetry: true });

    expect(
      shouldGenerateDailyInsights({
        localHour: 9,
        preferredHour: 8,
        hasInsightToday: false,
        retry: { attemptCount: 2, retryAt: null },
      }),
    ).toEqual({ run: false, isRetry: false });
  });

  it("prunes before today-minus-6 and reads retry delay env", () => {
    expect(dailyInsightPruneBeforeDate("2026-08-07")).toBe("2026-08-01");
    expect(dailyInsightsRetryDelayMs("60000")).toBe(60000);
    expect(dailyInsightsRetryDelayMs(undefined)).toBe(30 * 60 * 1000);
  });
});

describe("kotaReadBrief Prompt 6", () => {
  it("parses and formats Prompt 6 schema", () => {
    const brief = parseKotaReadBrief({
      patterns_observed: "- Commits clearly in session\n- Disengages within 48 hours",
      not_yet_reached: "The fear underneath the over-delivery has not been named.",
      be_careful_about: "This user shrinks when pushed toward big commitments too early.",
      most_important_now: "Stabilization before optimization.",
      confidence_note: "Kota has completed 12 sessions at Direct confidence level.",
    });
    expect(brief?.patterns_observed).toContain("Commits clearly");
    const formatted = formatKotaReadBrief(brief!);
    expect(formatted).toContain("Patterns I've observed");
    expect(formatted).toContain("Confidence note");
  });

  it("builds Prompt 6 user prompt fields", () => {
    const prompt = buildKotaReadUserPrompt({
      classification: "Capacity Erosion",
      coachingMode: "Rebuilder",
      sessionCount: 3,
      aiConfidenceLevel: "Exploratory",
      confirmedFingerprintSignals: "none — fewer than 5 sessions completed",
      sessionMemoryCompressed: "- Boundaries: named overload",
      activeFlags: "none",
      commitmentFollowThroughRate: "insufficient data",
      openCommitment: "none",
    });
    expect(prompt).toContain("patterns_observed");
    expect(prompt).toContain("Exploratory");
  });
});
