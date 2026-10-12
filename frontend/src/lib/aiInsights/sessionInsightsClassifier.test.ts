import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  classifySessionInsights,
  clearInsightResourceCache,
  parseSessionInsightsPayload,
} from "../../../../supabase/functions/chat/insights/sessionInsightsClassifier.ts";

const RESOURCE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";

type ConsentRow = { aiInsightsConsent: boolean | null; aiInsightsConsentVersion: number | null };

/** Fake service client covering the three queries the classifier makes. */
function fakeAdmin(consent: ConsentRow | (() => ConsentRow), existingFact = false) {
  const upsert = vi.fn(async () => ({ error: null }));
  const from = vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: typeof consent === "function" ? consent() : consent,
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "resource") {
      return {
        select: () => ({
          not: () => ({
            order: () => ({
              limit: async () => ({
                data: [{ id: RESOURCE_ID, title: "Box breathing guide" }],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "aiInsightSessionFact") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: existingFact ? { id: "f1" } : null, error: null }),
          }),
        }),
        upsert,
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { admin: { from } as unknown as SupabaseClient, upsert, from };
}

const GOOD_OUTPUT = JSON.stringify({
  topics: ["work_stress", "made_up_topic", "work_stress"],
  requestTypes: ["prioritize_workload"],
  concerns: ["overwhelm", "Jane Doe"],
  resourceIds: [RESOURCE_ID, OTHER_ID],
  crisisLineMentioned: false,
});

const baseParams = (admin: SupabaseClient, text = GOOD_OUTPUT) => ({
  admin,
  generate: vi.fn(async () => ({ text, usage: { inputTokens: 10, outputTokens: 5 } })),
  userId: "user-1",
  conversationId: CONVERSATION_ID,
  sessionType: "voice" as const,
  transcript: "User: I am drowning in work.\n\nKota: Let's prioritize.",
  now: new Date("2026-10-12T10:00:00Z"),
});

beforeEach(() => {
  clearInsightResourceCache();
});

describe("parseSessionInsightsPayload (NCLDD-55)", () => {
  it("keeps only taxonomy keys and catalog resource ids", () => {
    const fact = parseSessionInsightsPayload(GOOD_OUTPUT, new Set([RESOURCE_ID]));
    expect(fact).toEqual({
      topics: ["work_stress"],
      requestTypes: ["prioritize_workload"],
      concernThemes: ["overwhelm"],
      resourceIds: [RESOURCE_ID],
      crisisLineMentioned: false,
    });
  });

  it("rejects output with no usable topic or request type", () => {
    expect(parseSessionInsightsPayload('{"topics":["nope"]}', new Set())).toBeNull();
    expect(parseSessionInsightsPayload("not json", new Set())).toBeNull();
  });

  it("caps topics at three", () => {
    const fact = parseSessionInsightsPayload(
      JSON.stringify({
        topics: ["work_stress", "burnout_energy", "communication", "career_growth"],
        requestTypes: [],
      }),
      new Set(),
    );
    expect(fact?.topics).toHaveLength(3);
  });
});

describe("classifySessionInsights (NCLDD-55)", () => {
  it("stores a validated fact for a consenting user", async () => {
    const { admin, upsert } = fakeAdmin({ aiInsightsConsent: true, aiInsightsConsentVersion: 1 });
    const onUsage = vi.fn();
    const params = { ...baseParams(admin), onUsage };

    await expect(classifySessionInsights(params)).resolves.toBe("stored");
    expect(params.generate).toHaveBeenCalledOnce();
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 10, outputTokens: 5 });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        conversationId: CONVERSATION_ID,
        sessionType: "voice",
        sessionDate: "2026-10-12",
        topics: ["work_stress"],
        resourceIds: [RESOURCE_ID],
      }),
      { onConflict: "conversationId" },
    );
  });

  it.each([
    [{ aiInsightsConsent: false, aiInsightsConsentVersion: 1 }],
    [{ aiInsightsConsent: null, aiInsightsConsentVersion: null }],
    [{ aiInsightsConsent: true, aiInsightsConsentVersion: 0 }],
    [{ aiInsightsConsent: true, aiInsightsConsentVersion: 1000 }],
  ])("skips the model entirely without valid consent (%o)", async (consent) => {
    const { admin, upsert } = fakeAdmin(consent);
    const params = baseParams(admin);

    await expect(classifySessionInsights(params)).resolves.toBe("no_consent");
    expect(params.generate).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not write when consent is revoked while the model runs", async () => {
    let calls = 0;
    const { admin, upsert } = fakeAdmin(() => {
      calls += 1;
      return { aiInsightsConsent: calls === 1, aiInsightsConsentVersion: 1 };
    });

    await expect(classifySessionInsights(baseParams(admin))).resolves.toBe("no_consent");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not re-run the model for an already classified session", async () => {
    const { admin, upsert } = fakeAdmin({ aiInsightsConsent: true, aiInsightsConsentVersion: 1 }, true);
    const params = baseParams(admin);

    await expect(classifySessionInsights(params)).resolves.toBe("already_classified");
    expect(params.generate).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not write unusable model output", async () => {
    const { admin, upsert } = fakeAdmin({ aiInsightsConsent: true, aiInsightsConsentVersion: 1 });
    await expect(classifySessionInsights(baseParams(admin, "sorry"))).resolves.toBe("unparseable");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("swallows model errors", async () => {
    const { admin } = fakeAdmin({ aiInsightsConsent: true, aiInsightsConsentVersion: 1 });
    const params = baseParams(admin);
    params.generate.mockRejectedValueOnce(new Error("boom"));
    await expect(classifySessionInsights(params)).resolves.toBe("error");
  });
});
