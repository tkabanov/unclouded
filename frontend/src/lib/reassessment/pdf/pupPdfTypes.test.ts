import { describe, expect, it } from "vitest";
import {
  needsPupPdfRegeneration,
  pdfDownloadLabel,
  pdfStoragePath,
  shouldGeneratePupPdf,
} from "@/lib/reassessment/pdf/pupPdfTypes";

describe("pupPdfTypes helpers", () => {
  it("builds storage path under user folder", () => {
    expect(pdfStoragePath("user-1", "assessment-2")).toBe("user-1/assessment-2.pdf");
  });

  it("labels Pro vs Premium downloads", () => {
    expect(pdfDownloadLabel("pro")).toContain("summary");
    expect(pdfDownloadLabel("premium")).toContain("report");
  });

  it("requires regeneration when tier upgrades from pro to premium", () => {
    expect(
      needsPupPdfRegeneration(
        { coachingContext: "Pro text", generatedForTier: "pro" },
        "premium",
        true,
      ),
    ).toBe(true);
  });

  it("skips regeneration when premium narrative matches tier and layout", () => {
    expect(
      needsPupPdfRegeneration(
        {
          coachingContext: "Context",
          coachingSummary: "Summary",
          nextFocus: "Focus",
          generatedForTier: "premium",
          renderVersion: 4,
        },
        "premium",
        true,
      ),
    ).toBe(false);
  });

  it("requires regeneration when render layout version changes", () => {
    expect(
      needsPupPdfRegeneration(
        {
          coachingContext: "Context",
          coachingSummary: "Summary",
          nextFocus: "Focus",
          generatedForTier: "premium",
          renderVersion: 1,
        },
        "premium",
        true,
      ),
    ).toBe(true);
  });

  it("shouldGenerate when pdf flags are cleared", () => {
    expect(
      shouldGeneratePupPdf(
        { pdfGenerated: false, pdfUrl: null, pdfNarrative: null },
        "premium",
      ),
    ).toBe(true);
  });
});
