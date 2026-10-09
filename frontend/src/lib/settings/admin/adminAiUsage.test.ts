import { describe, expect, it } from "vitest";
import { ADMIN_SUB_TAB, ADMIN_SUB_TAB_LABELS } from "@/lib/settings/admin/adminTabStore";
import { ADMIN_NAV_PATH, ADMIN_MORE_NAV, resolveAdminSubTab } from "@/lib/settings/admin/adminNav";
import { parseLimitAmount, AI_LIMIT_MAX_USD } from "@/lib/settings/admin/aiLimitValidation";
import {
  formatDurationMmSs,
  formatPctChange,
  formatUsd,
  pctChange,
  resolvePeriod,
} from "@/lib/settings/admin/aiUsagePeriod";
import { describeAuditValue, mapAiUsageOverview } from "@/lib/settings/admin/adminAiUsageApi";
import { describeEffectiveLimit } from "@/lib/settings/admin/aiLimitLabels";

describe("AI Usage navigation (NCLDD-52)", () => {
  it("registers the AI Usage tab after AI Settings", () => {
    expect(ADMIN_SUB_TAB_LABELS.ai_usage).toBe("AI Usage");
    expect(ADMIN_NAV_PATH.ai_usage).toBe("/admin/ai-usage");
    expect(resolveAdminSubTab("/admin/ai-usage")).toBe(ADMIN_SUB_TAB.AI_USAGE);
    const nav = [...ADMIN_MORE_NAV];
    expect(nav.indexOf(ADMIN_SUB_TAB.AI_USAGE)).toBe(nav.indexOf(ADMIN_SUB_TAB.AI_SETTINGS) + 1);
  });
});

describe("resolvePeriod", () => {
  const now = new Date("2026-10-08T15:30:00Z");

  it("resolves presets as inclusive UTC date ranges ending today", () => {
    expect(resolvePeriod("today", now)).toEqual({ from: "2026-10-08", to: "2026-10-08" });
    expect(resolvePeriod("7d", now)).toEqual({ from: "2026-10-02", to: "2026-10-08" });
    expect(resolvePeriod("30d", now)).toEqual({ from: "2026-09-09", to: "2026-10-08" });
  });

  it("keeps a custom range and swaps reversed dates", () => {
    expect(resolvePeriod({ from: "2026-01-01", to: "2026-01-31" }, now)).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(resolvePeriod({ from: "2026-02-10", to: "2026-02-01" }, now)).toEqual({
      from: "2026-02-01",
      to: "2026-02-10",
    });
  });
});

describe("format helpers", () => {
  it("formats durations as Xm Ys", () => {
    expect(formatDurationMmSs(0)).toBe("0m 00s");
    expect(formatDurationMmSs(125)).toBe("2m 05s");
    expect(formatDurationMmSs(null)).toBe("—");
  });

  it("formats USD and keeps tiny amounts visible", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(0.0042)).toBe("$0.0042");
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(null)).toBe("—");
  });

  it("computes percent change and has no baseline for a zero prior", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(10, 0)).toBeNull();
    expect(formatPctChange(12.34)).toBe("+12.3% vs prior period");
    expect(formatPctChange(null)).toBe("no prior data");
  });
});

describe("parseLimitAmount", () => {
  it("treats empty input as not set", () => {
    expect(parseLimitAmount("  ")).toMatchObject({ ok: true, value: null });
  });

  it("accepts 0..max with up to 2 decimals", () => {
    expect(parseLimitAmount("0")).toMatchObject({ ok: true, value: 0 });
    expect(parseLimitAmount("12.5")).toMatchObject({ ok: true, value: 12.5 });
    expect(parseLimitAmount("$3.99")).toMatchObject({ ok: true, value: 3.99 });
    expect(parseLimitAmount(String(AI_LIMIT_MAX_USD))).toMatchObject({ ok: true, value: AI_LIMIT_MAX_USD });
  });

  it("rejects negatives, extra decimals, junk and values above the max", () => {
    for (const bad of ["-1", "1.234", "abc", "1e3", "1,5", "100000.01", "100001"]) {
      expect(parseLimitAmount(bad).ok).toBe(false);
    }
  });
});

describe("overview mapping", () => {
  it("maps a full payload and tolerates a missing prior period", () => {
    const mapped = mapAiUsageOverview({
      ok: true,
      dataSince: "2026-10-08T00:00:00Z",
      kpis: { sessions: 4, activeUsers: 2, spendUsd: "1.5", avgCostPerSessionUsd: 0.375 },
      daily: [{ date: "2026-10-08", sessions: 4, spendUsd: 1.5 }],
      byMode: [{ mode: "voice", sessions: 1, spendUsd: 0.5 }],
      byPlan: [{ tier: "premium", sessions: 1, spendUsd: 0.2 }],
      byModel: [{ provider: "openai", model: "gpt-4o-mini", sessions: 4, spendUsd: 1.5, costPerSessionUsd: 0.375, pricingMissing: true }],
      topUsers: [{ userId: "u1", displayName: "Ada", sessions: 3, spendUsd: 1, currentTier: "pro" }],
      avgDurationSeconds: { text: 300, voice: null },
    });
    expect(mapped.kpis.spendUsd).toBe(1.5);
    expect(mapped.kpis.prior.sessions).toBe(0);
    expect(mapped.byMode[0].mode).toBe("voice");
    expect(mapped.byModel[0].pricingMissing).toBe(true);
    expect(mapped.avgDurationSeconds).toEqual({ text: 300, voice: null });
  });

  it("returns safe empties for an empty payload", () => {
    const mapped = mapAiUsageOverview(null);
    expect(mapped.daily).toEqual([]);
    expect(mapped.dataSince).toBeNull();
  });
});

describe("limit descriptions", () => {
  const base = {
    mode: "text" as const,
    tier: "pro" as const,
    monthSpendUsd: 0,
    baselineUsd: 0,
    usedUsd: 0,
    remainingUsd: null,
    exceeded: false,
  };

  it("labels the source of the effective limit", () => {
    expect(describeEffectiveLimit({ ...base, source: "plan", limitUsd: 5 })).toBe(
      "Effective: $5.00 — from plan Pro",
    );
    expect(describeEffectiveLimit({ ...base, source: "custom", limitUsd: 1 })).toBe(
      "Effective: $1.00 — custom override",
    );
    expect(describeEffectiveLimit({ ...base, source: "unlimited", limitUsd: null })).toContain(
      "Unlimited",
    );
    expect(describeEffectiveLimit({ ...base, tier: "free", source: "unset", limitUsd: null })).toContain(
      "Basic (Free)",
    );
  });

  it("describes audit values", () => {
    expect(describeAuditValue("plan_limit_set", { monthlyUsd: null })).toBe("not set");
    expect(describeAuditValue("plan_limit_set", { monthlyUsd: 2 })).toBe("$2.00");
    expect(describeAuditValue("user_override_set", { kind: "custom", monthlyUsd: 1 })).toBe("Custom $1.00");
    expect(describeAuditValue("user_unlimited_set", { kind: "unlimited" })).toBe("Unlimited");
    expect(describeAuditValue("user_override_cleared", { kind: "plan" })).toBe("Plan default");
  });
});
