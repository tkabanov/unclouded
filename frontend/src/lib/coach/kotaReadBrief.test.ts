import { describe, expect, it } from "vitest";

import {
  buildKotaReadUserPrompt,
  filterSessionMemoryForKotaRead,
  formatKotaReadBrief,
  formatPatternLine,
  parseKotaReadBrief,
  resolveOpenCommitmentLine,
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
    expect(prompt).toContain("last 90 days");
    expect(prompt).toContain('"patterns"');
  });

  it("filters session memory to the last 90 days", () => {
    const filtered = filterSessionMemoryForKotaRead(
      [
        {
          conversationId: "old",
          closedAt: "2026-01-01T12:00:00.000Z",
          topic: "old",
          summaryStub: "old theme",
        },
        {
          conversationId: "recent",
          closedAt: "2026-07-01T12:00:00.000Z",
          topic: "recent",
          summaryStub: "recent theme",
        },
      ],
      new Date("2026-07-20T12:00:00.000Z"),
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.topic).toBe("recent");
  });

  it("reports open commitment only when follow-through status is open", () => {
    const line = resolveOpenCommitmentLine(
      [
        {
          conversationId: "c1",
          closedAt: "2026-07-10",
          topic: "sleep",
          summaryStub: "Named poor sleep.",
          microCommitment: "No screens after 10pm",
          commitmentStatus: "completed",
        },
      ],
      { micro_commitment_active_text: "No screens after 10pm" },
      new Date("2026-07-20"),
    );

    expect(line).toBe("Open commitment: none recorded");
  });
});
