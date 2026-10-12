import { describe, expect, it } from "vitest";

import { mapAiInsightsOverview } from "@/lib/settings/admin/adminAiInsightsApi";
import { ADMIN_MORE_NAV, ADMIN_NAV_PATH, resolveAdminSubTab } from "@/lib/settings/admin/adminNav";
import { ADMIN_SUB_TAB, ADMIN_SUB_TAB_LABELS } from "@/lib/settings/admin/adminTabStore";

import {
  hasValidAiInsightsConsent,
  needsAiInsightsConsentPrompt,
} from "../../../../../supabase/functions/_shared/aiInsights/taxonomy.ts";

describe("AI Insights navigation (NCLDD-55)", () => {
  it("is a separate tab from the Insights articles editor", () => {
    expect(ADMIN_SUB_TAB_LABELS.ai_insights).toBe("AI Insights");
    expect(ADMIN_NAV_PATH.ai_insights).toBe("/admin/ai-insights");
    expect(resolveAdminSubTab("/admin/ai-insights")).toBe(ADMIN_SUB_TAB.AI_INSIGHTS);
    expect(resolveAdminSubTab("/admin/insights")).toBe(ADMIN_SUB_TAB.INSIGHTS);
    expect([...ADMIN_MORE_NAV]).toContain(ADMIN_SUB_TAB.AI_INSIGHTS);
  });
});

describe("AI Insights consent rules (NCLDD-55)", () => {
  it("prompts until the current version is answered", () => {
    expect(needsAiInsightsConsentPrompt(null, null)).toBe(true);
    expect(needsAiInsightsConsentPrompt(true, 0)).toBe(true);
    expect(needsAiInsightsConsentPrompt(false, 1)).toBe(false);
    expect(needsAiInsightsConsentPrompt(true, 1)).toBe(false);
  });

  it("treats only a current grant as valid consent", () => {
    expect(hasValidAiInsightsConsent(true, 1)).toBe(true);
    expect(hasValidAiInsightsConsent(false, 1)).toBe(false);
    expect(hasValidAiInsightsConsent(null, null)).toBe(false);
    expect(hasValidAiInsightsConsent(true, null)).toBe(false);
  });
});

describe("mapAiInsightsOverview (NCLDD-55)", () => {
  it("maps a suppressed sample without inventing numbers", () => {
    const overview = mapAiInsightsOverview({
      ok: true,
      period: { from: "2026-10-01", to: "2026-10-07", bucket: "week" },
      kThreshold: 5,
      sample: { suppressed: true },
      topics: [],
      feedback: { suppressed: true },
    });
    expect(overview.sample).toMatchObject({ suppressed: true, users: 0, sessions: 0 });
    expect(overview.crisisLines).toMatchObject({ suppressed: true });
    expect(overview.feedback).toMatchObject({ suppressed: true, reasons: [] });
    expect(overview.topics).toEqual([]);
  });

  it("labels taxonomy keys and caps request types at 20", () => {
    const overview = mapAiInsightsOverview({
      period: {
        from: "2026-08-31",
        to: "2026-10-04",
        bucket: "week",
        requestedFrom: "2026-09-01",
        requestedTo: "2026-10-12",
      },
      kThreshold: 5,
      sample: { suppressed: false, users: 10, sessions: 20, textSessions: 20, voiceSessions: null },
      topics: [{ key: "work_stress", sessions: 12, users: 7 }],
      requestTypes: Array.from({ length: 25 }, (_, i) => ({
        key: i === 0 ? "prioritize_workload" : `legacy_${i}`,
        sessions: 25 - i,
        users: 5,
      })),
      concerns: [{ key: "overwhelm", sessions: 6, users: 5 }],
      resources: [{ resourceId: "r1", title: "Box breathing", sessions: 6, users: 5 }],
      crisisLines: { suppressed: false, sessions: 5, users: 5 },
      feedback: {
        suppressed: false,
        ratedMessages: 40,
        raters: 8,
        up: 30,
        down: 10,
        upShare: 0.75,
        reasons: [{ key: "too_generic", rating: -1, count: 6 }],
      },
    });

    expect(overview.period).toMatchObject({ from: "2026-08-31", requestedTo: "2026-10-12" });
    expect(overview.sample.voiceSessions).toBeNull();
    expect(overview.topics[0]).toMatchObject({ key: "work_stress", label: "Work stress" });
    expect(overview.requestTypes).toHaveLength(20);
    expect(overview.requestTypes[0].label).toBe("How do I prioritize my workload?");
    // Unknown keys from an older taxonomy fall back to the key instead of disappearing.
    expect(overview.requestTypes[1].label).toBe("legacy_1");
    expect(overview.concerns[0].label).toBe("Feeling overwhelmed");
    expect(overview.feedback).toMatchObject({
      suppressed: false,
      upShare: 0.75,
      reasons: [{ key: "too_generic", label: "Too generic", rating: -1, count: 6 }],
    });
  });
});
