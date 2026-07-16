import { describe, expect, it } from "vitest";
import { pupPdfContainsDisclaimer, renderPupPdf } from "@/lib/reassessment/pdf/renderPupPdf";
import {
  COACHING_DISCLAIMER,
  PUP_PDF_PAYLOAD_VERSION,
  type PupPdfPayload,
} from "@/lib/reassessment/pdf/pupPdfTypes";

function basePayload(overrides: Partial<PupPdfPayload> = {}): PupPdfPayload {
  return {
    version: PUP_PDF_PAYLOAD_VERSION,
    tier: "pro",
    assessmentResultId: "test-id",
    firstName: "Alex",
    assessmentDate: "2026-07-16T00:00:00.000Z",
    platformName: "Uncloud360",
    scores: { stability: 3.2, performance: 3.5, alignment: 3.1, orientation: 3 },
    classificationName: "Capacity Erosion",
    classificationDescription: "A description.",
    focusAreas: ["Sleep", "Boundaries", "Recovery"],
    trajectoryType: "holding_steady",
    trajectoryStatement: "Your scores are holding.",
    microCommitment: "Walk after lunch",
    reflections: [
      {
        field: "reflection_q1",
        question: "What shifted?",
        answer: "I sleep better.",
      },
    ],
    disclaimer: COACHING_DISCLAIMER,
    narrative: {
      coachingContext: "You are building steadier ground under pressure.",
    },
    ...overrides,
  };
}

describe("renderPupPdf", () => {
  it("renders a non-empty Pro PDF with disclaimer content", () => {
    const bytes = renderPupPdf(basePayload());
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(pupPdfContainsDisclaimer(bytes)).toBe(true);
  });

  it("renders a larger Premium PDF with fingerprint section data", () => {
    const pro = renderPupPdf(basePayload({ tier: "pro" }));
    const premium = renderPupPdf(
      basePayload({
        tier: "premium",
        premiumBranding: true,
        behavioralFingerprint: "Avoidant / Conditional — delays until conditions feel perfect",
        narrative: {
          coachingContext: "Context paragraph.",
          coachingSummary: "Summary paragraph one.\n\nSummary paragraph two.",
          nextFocus: "Focus on recovery rituals for the next 90 days.",
        },
        subDimensions: [
          { pillar: "Stability", questions: [{ label: "q1", score: 3 }] },
        ],
        scoreTrend: [
          {
            date: "2026-01-01T00:00:00.000Z",
            stability: 2.5,
            performance: 2.8,
            alignment: 2.6,
            classification: "A",
          },
          {
            date: "2026-07-01T00:00:00.000Z",
            stability: 3.2,
            performance: 3.5,
            alignment: 3.1,
            classification: "B",
          },
        ],
        pathHistory: [
          { pathName: "Stress Regulation", status: "completed", completedSessionsCount: 8 },
        ],
      }),
    );
    expect(premium.byteLength).toBeGreaterThan(pro.byteLength);
    expect(pupPdfContainsDisclaimer(premium)).toBe(true);
  });
});
