import { describe, expect, it } from "vitest";
import {
  articleMatchesUser,
  scoreArticleMatch,
  selectDailyInsightArticleIds,
  type InsightArticleCandidate,
  type UserInsightContext,
} from "@/lib/dashboard/insightsFeedMatching";

const USER: UserInsightContext = {
  classificationKey: "capacity_erosion",
  primaryPillar: "professional",
  nervousSystem: "depleted",
};

const ARTICLES: InsightArticleCandidate[] = [
  {
    id: "a1",
    classificationKey: "capacity_erosion",
    primaryPillar: null,
    nervousSystem: null,
  },
  {
    id: "a2",
    classificationKey: "performance_stagnation",
    primaryPillar: null,
    nervousSystem: null,
  },
  {
    id: "a3",
    classificationKey: null,
    primaryPillar: "professional",
    nervousSystem: null,
  },
  {
    id: "a4",
    classificationKey: null,
    primaryPillar: null,
    nervousSystem: "depleted",
  },
  {
    id: "a5",
    classificationKey: null,
    primaryPillar: null,
    nervousSystem: null,
  },
];

describe("insightsFeedMatching", () => {
  it("rejects articles with mismatched classification tags", () => {
    expect(articleMatchesUser(ARTICLES[1], USER)).toBe(false);
    expect(articleMatchesUser(ARTICLES[0], USER)).toBe(true);
  });

  it("scores exact tag matches higher than wildcards", () => {
    expect(scoreArticleMatch(ARTICLES[0], USER)).toBeGreaterThan(
      scoreArticleMatch(ARTICLES[4], USER),
    );
  });

  it("selects three articles and skips recently shown ids", () => {
    const selected = selectDailyInsightArticleIds(ARTICLES, USER, new Set(["a1"]));
    expect(selected).toHaveLength(3);
    expect(selected).not.toContain("a1");
    expect(selected).not.toContain("a2");
  });

  it("falls back to generic articles when not enough tag matches exist", () => {
    const selected = selectDailyInsightArticleIds(
      [ARTICLES[4], { id: "a6", classificationKey: null, primaryPillar: null, nervousSystem: null }],
      USER,
      new Set(),
      3,
    );
    expect(selected).toEqual(["a5", "a6"]);
  });
});
