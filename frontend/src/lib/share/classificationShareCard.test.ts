import { describe, expect, it } from "vitest";

import {
  buildClassificationShareCardMetadata,
  generateReferralCode,
} from "./classificationShareCard";
import {
  buildLinkedInShareUrl,
  shareCardDownloadFilename,
  wrapCanvasLines,
} from "./classificationShareCardImage";

describe("classificationShareCard", () => {
  it("reuses an existing referral code", () => {
    expect(generateReferralCode("abc123")).toBe("ABC123");
  });

  it("builds signup URL with referral code", () => {
    const metadata = buildClassificationShareCardMetadata({
      classificationKey: "capacity_erosion",
      referralCode: "TESTCODE",
      origin: "https://app.uncloud360.ai",
    });

    expect(metadata.shareUrl).toBe("https://app.uncloud360.ai/signup?ref=TESTCODE");
    expect(metadata.classificationName).toBe("Capacity Erosion");
  });
});

describe("classificationShareCardImage helpers", () => {
  it("builds LinkedIn share URL", () => {
    expect(buildLinkedInShareUrl("https://app.uncloud360.ai/signup?ref=ABC")).toContain(
      "linkedin.com/sharing/share-offsite",
    );
  });

  it("wraps long canvas text", () => {
    const mockCtx = {
      measureText(text: string) {
        return { width: text.length * 8 };
      },
    } as CanvasRenderingContext2D;

    const lines = wrapCanvasLines(
      mockCtx,
      "High Output Hidden Instability profile share",
      120,
    );
    expect(lines.length).toBeGreaterThan(1);
  });

  it("builds download filename from classification key", () => {
    expect(shareCardDownloadFilename("high_output_hidden_instability")).toBe(
      "uncloud360-high-output-hidden-instability-share.png",
    );
  });
});
