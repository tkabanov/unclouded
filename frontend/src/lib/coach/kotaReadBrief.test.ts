import { describe, expect, it } from "vitest";

import {
  buildKotaReadUserPrompt,
  formatKotaReadBrief,
  formatPatternLine,
  parseKotaReadBrief,
} from "../../../../supabase/functions/_shared/kotaReadBrief.ts";

describe("kotaReadBrief", () => {
  it("parses structured JSON brief", () => {
    const brief = parseKotaReadBrief({
      sessionThemes: "Work overload and boundary guilt have dominated recent sessions.",
      patterns: [
        {
          pattern: "minimize depletion while continuing to over-deliver",
          trigger: "manager asks for one more thing",
          approachTried: "naming the cost without asking them to stop performing",
          result: "brief honesty, then quick return to reassurance",
        },
      ],
      underneath: "the fear that slowing down means becoming replaceable",
      caution: "pushes back hard when challenged too directly before trust is rebuilt",
    });

    expect(brief?.patterns).toHaveLength(1);
    expect(formatPatternLine(brief!.patterns[0])).toContain("It shows up when");
  });

  it("formats Block 3.35 sections for storage", () => {
    const formatted = formatKotaReadBrief({
      sessionThemes: "Recent sessions focused on recovery boundaries.",
      patterns: [
        {
          pattern: "intellectualize exhaustion",
          trigger: "asked how they are really doing",
          approachTried: "slowing pace and validating depletion",
          result: "more honesty for a few exchanges",
        },
      ],
      underneath: "grief they have not fully named",
      caution: "gets smaller when pushed toward big commitments too early",
    });

    expect(formatted).toContain("Session themes (recent)");
    expect(formatted).toContain("Patterns observed");
    expect(formatted).toContain("Underneath");
    expect(formatted).toContain("Be careful about");
    expect(formatted).toContain("has not surfaced yet");
  });

  it("builds user prompt with factual context", () => {
    const prompt = buildKotaReadUserPrompt({
      firstName: "Alex",
      classificationLine: "Classification: Capacity Erosion",
      scoresLine: "Scores — Stability 2.4, Performance 2.8, Alignment 2.6",
      pathsLine: "Active paths: Recovery Roadmap (active, 1 sessions completed)",
      openCommitmentLine: "Open commitment: rest before 10pm twice this week",
      sessionMemoryLines: ["- Boundaries: User named manager overload"],
      memoryFactsJson: '{"statedGoals":"Be present with kids"}',
    });

    expect(prompt).toContain("Classification: Capacity Erosion");
    expect(prompt).toContain("Open commitment:");
    expect(prompt).toContain('"patterns"');
  });
});
