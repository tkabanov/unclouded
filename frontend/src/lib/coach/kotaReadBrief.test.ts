import { describe, expect, it } from "vitest";

import {
  buildKotaReadUserPrompt,
  filterSessionMemoryForKotaRead,
  formatFactualBriefFromContext,
  formatFactualBriefSection,
  formatFullCoachBrief,
  formatKotaReadBrief,
  parseKotaReadBrief,
  resolveLastSessionDate,
  resolveOpenCommitmentLine,
} from "../../../../supabase/functions/_shared/kotaReadBrief.ts";

describe("kotaReadBrief", () => {
  it("parses structured JSON brief (Prompt 6)", () => {
    const brief = parseKotaReadBrief({
      patterns_observed: "- minimizes depletion while over-delivering",
      not_yet_reached: "Fear of becoming replaceable if they slow down.",
      be_careful_about: "Pushes back hard when challenged too directly before trust is rebuilt.",
      most_important_now: "They need steadiness more than another insight.",
      confidence_note: "Kota has completed 12 sessions with this user at Direct confidence level.",
    });

    expect(brief?.patterns_observed).toContain("over-delivering");
    expect(brief?.confidence_note).toContain("Direct");
  });

  it("formats Prompt 6 sections for storage", () => {
    const formatted = formatKotaReadBrief({
      patterns_observed: "- intellectualize exhaustion",
      not_yet_reached: "Grief they have not fully named.",
      be_careful_about: "Gets smaller when pushed toward big commitments too early.",
      most_important_now: "Presence before precision.",
      confidence_note: "Kota has completed 8 sessions at Guided confidence level.",
    });

    expect(formatted).toContain("Patterns I've observed");
    expect(formatted).toContain("What I haven't been able to get to");
    expect(formatted).toContain("One thing to be careful about");
    expect(formatted).toContain("What I think is most important right now");
    expect(formatted).toContain("Confidence note");
  });

  it("formats factual brief section without AI", () => {
    const factual = formatFactualBriefSection({
      classification: "Capacity Erosion",
      scoresLine: "Scores — Stability 2.4, Performance 2.8, Alignment 2.6",
      coachingMode: "Stabilizer",
      pathsLine: "Active paths: Recovery Roadmap (active, 1 sessions completed)",
      openCommitment: "lights out by 10pm twice",
      activeFlags: "none",
      sessionCount: 6,
      lastSessionDate: "2026-07-01",
    });

    expect(factual).toContain("FACTUAL DATA");
    expect(factual).toContain("Classification: Capacity Erosion");
    expect(factual).toContain("Scores — Stability 2.4");
    expect(factual).toContain("Coaching mode: Stabilizer");
    expect(factual).toContain("Active paths: Recovery Roadmap");
    expect(factual).toContain("Open commitment: lights out by 10pm twice");
    expect(factual).toContain("Active flags: none");
    expect(factual).toContain("Sessions completed: 6");
    expect(factual).toContain("Last session date: 2026-07-01");
  });

  it("combines factual + Kota's Read into full coach brief", () => {
    const full = formatFullCoachBrief(
      formatFactualBriefFromContext({
        classification: "Capacity Erosion",
        coachingMode: "Stabilizer",
        sessionCount: 6,
        aiConfidenceLevel: "Guided",
        confirmedFingerprintSignals: "over_responsibility",
        sessionMemoryCompressed: "- Boundaries",
        activeFlags: "none",
        commitmentFollowThroughRate: "72%",
        openCommitment: "rest before 10pm",
        scoresLine: "Scores — Stability 2.4, Performance 2.8, Alignment 2.6",
        pathsLine: "Active paths: Recovery Roadmap (active, 1 sessions completed)",
        lastSessionDate: "2026-07-01",
      }),
      "KOTA'S READ — Coach handoff brief\n\nPatterns I've observed\n- over-delivers",
    );

    expect(full).toContain("FACTUAL DATA");
    expect(full).toContain("Classification: Capacity Erosion");
    expect(full).toContain("KOTA'S READ — Coach handoff brief");
    expect(full.indexOf("FACTUAL DATA")).toBeLessThan(full.indexOf("KOTA'S READ"));
  });

  it("resolves last session date from memory records", () => {
    expect(
      resolveLastSessionDate([
        { closedAt: "2026-01-01T12:00:00.000Z" },
        { closedAt: "2026-07-15T08:00:00.000Z" },
      ]),
    ).toBe("2026-07-15");
    expect(resolveLastSessionDate([])).toBe("not recorded");
  });

  it("builds user prompt with Prompt 6 fields", () => {
    const prompt = buildKotaReadUserPrompt({
      classification: "Capacity Erosion",
      coachingMode: "Stabilizer",
      sessionCount: 6,
      aiConfidenceLevel: "Guided",
      confirmedFingerprintSignals: "over_responsibility",
      sessionMemoryCompressed: "- Boundaries: User named manager overload",
      activeFlags: "none",
      commitmentFollowThroughRate: "72%",
      openCommitment: "rest before 10pm twice this week",
      scoresLine: "Scores — Stability 2.4, Performance 2.8, Alignment 2.6",
      pathsLine: "Active paths: Recovery Roadmap (active, 1 sessions completed)",
    });

    expect(prompt).toContain("Classification: Capacity Erosion");
    expect(prompt).toContain("patterns_observed");
    expect(prompt).toContain("Guided");
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
          conversationId: "new",
          closedAt: "2026-07-01T12:00:00.000Z",
          topic: "new",
          summaryStub: "new theme",
        },
      ],
      new Date("2026-07-15T12:00:00.000Z"),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.conversationId).toBe("new");
  });

  it("resolves open commitment line from session memory", () => {
    const line = resolveOpenCommitmentLine(
      [
        {
          conversationId: "c1",
          closedAt: "2026-07-01T12:00:00.000Z",
          topic: "Rest",
          summaryStub: "Named depletion",
          microCommitment: "lights out by 10pm twice",
        },
      ],
      null,
      new Date("2026-07-02T12:00:00.000Z"),
    );
    expect(line.toLowerCase()).toContain("open commitment");
  });
});
