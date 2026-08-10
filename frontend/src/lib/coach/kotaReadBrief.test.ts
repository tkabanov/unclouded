import { describe, expect, it } from "vitest";

import {
  buildKotaReadUserPrompt,
  compressSessionMemoryForKotaRead,
  filterSessionMemoryForKotaRead,
  formatFactualBriefFromContext,
  formatFactualBriefSection,
  formatFullCoachBrief,
  formatKotaReadBrief,
  KOTA_READ_JSON_INSTRUCTIONS,
  KOTA_READ_MEMORY_MAX_CHARS,
  KOTA_READ_SYSTEM_PROMPT,
  parseKotaReadBrief,
  resolveKotaReadDisplayText,
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

  it("formats Prompt 6 sections for display (not storage)", () => {
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

  it("prefers kotaReadJson over legacy kotaRead text", () => {
    const display = resolveKotaReadDisplayText({
      kotaReadJson: {
        patterns_observed: "- from json",
        not_yet_reached: "json not yet",
        be_careful_about: "json careful",
        most_important_now: "json now",
        confidence_note: "json confidence",
      },
      kotaRead: "LEGACY TEXT SHOULD NOT WIN",
    });
    expect(display).toContain("from json");
    expect(display).not.toContain("LEGACY TEXT");

    expect(
      resolveKotaReadDisplayText({
        kotaReadJson: null,
        kotaRead: "legacy brief text",
      }),
    ).toBe("legacy brief text");
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

  it("includes full Prompt 6 guidance including crisis_prone", () => {
    expect(KOTA_READ_SYSTEM_PROMPT).toContain("coach-to-coach");
    expect(KOTA_READ_JSON_INSTRUCTIONS).toContain("crisis_prone");
    expect(KOTA_READ_JSON_INSTRUCTIONS).toContain("Observation period is early");
    expect(KOTA_READ_JSON_INSTRUCTIONS).toContain("violation of the trust");
    expect(KOTA_READ_JSON_INSTRUCTIONS).toContain("confidence_note");
  });

  it("filters session memory to the last 5 sessions (not 90-day window)", () => {
    const records = Array.from({ length: 7 }, (_, index) => ({
      conversationId: `c${index}`,
      closedAt: `2026-0${index + 1}-01T12:00:00.000Z`,
      topic: `topic-${index}`,
      summaryStub: `summary-${index}`,
    }));
    const filtered = filterSessionMemoryForKotaRead(records, new Date("2026-08-01T12:00:00.000Z"));
    expect(filtered).toHaveLength(5);
    expect(filtered[0]?.conversationId).toBe("c2");
    expect(filtered[4]?.conversationId).toBe("c6");
  });

  it("compresses session memory under the ~600-token char budget", () => {
    const records = Array.from({ length: 5 }, (_, index) => ({
      conversationId: `c${index}`,
      closedAt: `2026-07-0${index + 1}T12:00:00.000Z`,
      topic: "Theme ".repeat(40),
      summaryStub: "Detail ".repeat(80),
      keyPatternOrInsight: "Pattern ".repeat(40),
    }));
    const compressed = compressSessionMemoryForKotaRead(records);
    expect(compressed.length).toBeLessThanOrEqual(KOTA_READ_MEMORY_MAX_CHARS);
    expect(compressed.endsWith("…")).toBe(true);
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
