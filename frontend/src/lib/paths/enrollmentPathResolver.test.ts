import { describe, expect, it } from "vitest";
import { resolveEffectiveCheckInStreak } from "../../../../supabase/functions/chat/liveContext/streakHelpers.ts";
import {
  remapSessionToCatalog,
  resolvePathKeyFromEnrollment,
} from "./enrollmentPathResolver";
import { slugifyPathName } from "./pathsCatalogApi";

describe("enrollmentPathResolver", () => {
  it("resolves path key from embedded path name", () => {
    expect(
      resolvePathKeyFromEnrollment({
        name: "Building Professional Momentum",
      }),
    ).toBe("Building Professional Momentum");
  });

  it("falls back to onboarding path slug", () => {
    expect(
      resolvePathKeyFromEnrollment(null, {
        path_enrollment1: { path_slug: "building-professional-momentum" },
      }),
    ).toBe("building-professional-momentum");
  });

  it("remaps stale session ids by title", () => {
    const sessions = [
      { id: "new-1", index: 1, title: "Session one", coachingText: "", microCommitment: "" },
      { id: "new-2", index: 2, title: "Session two", coachingText: "", microCommitment: "" },
    ];

    expect(
      remapSessionToCatalog("old-session-id", "Session two", sessions, 1),
    ).toBe("new-2");
  });
});

describe("pathsCatalogApi slug matching", () => {
  it("slugifies lookup keys consistently", () => {
    expect(slugifyPathName("Building Professional Momentum")).toBe(
      "building-professional-momentum",
    );
  });
});

describe("check-in streak helpers", () => {
  const ref = new Date("2026-07-16T15:00:00.000Z");

  it("resets streak after a missed day", () => {
    expect(
      resolveEffectiveCheckInStreak(["2026-07-13", "2026-07-14"], ref),
    ).toBe(0);
  });
});
