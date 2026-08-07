import { describe, expect, it } from "vitest";
import { parseDailyInsights } from "../../../../supabase/functions/_shared/standalonePrompts/dailyInsights.ts";
import { parsePathClosing } from "../../../../supabase/functions/_shared/standalonePrompts/pathClosing.ts";
import { parseCoachingSummary } from "../../../../supabase/functions/_shared/standalonePrompts/coachingSummary.ts";
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
