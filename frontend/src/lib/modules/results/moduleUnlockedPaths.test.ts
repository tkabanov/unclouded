import { describe, expect, it } from "vitest";

import { TIER } from "@/lib/enums/tier";
import type { PathCatalogEntry } from "@/lib/paths/pathsCatalogApi";

import { resolveNewlyUnlockedPaths } from "./moduleUnlockedPaths";

function path(overrides: Partial<PathCatalogEntry & { isActive?: boolean }>): PathCatalogEntry & {
  isActive?: boolean;
} {
  return {
    id: "path-1",
    slug: "path-1",
    name: "Path One",
    description: "",
    tier: TIER.FREE,
    pillar: "identity",
    sessionsCount: 4,
    triggerSignals: "",
    ...overrides,
  };
}

describe("resolveNewlyUnlockedPaths", () => {
  it("returns a module_complete-gated path after the module completes, not before", () => {
    const catalog = [path({ id: "p1", triggerSignals: "prerequisite:module:identity" })];

    const before = resolveNewlyUnlockedPaths({
      slug: "identity",
      profileBefore: { moduleIdentityComplete: false },
      profileAfter: { moduleIdentityComplete: false },
      catalog,
      userTier: TIER.FREE,
    });
    expect(before).toEqual([]);

    const after = resolveNewlyUnlockedPaths({
      slug: "identity",
      profileBefore: { moduleIdentityComplete: false },
      profileAfter: { moduleIdentityComplete: true },
      catalog,
      userTier: TIER.FREE,
    });
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe("p1");
  });

  it("returns a field_equals-gated path only when that exact answer was given", () => {
    const catalog = [
      path({ id: "p2", triggerSignals: "prerequisite:field:bodyRelationship=disconnected" }),
    ];

    const wrongAnswer = resolveNewlyUnlockedPaths({
      slug: "body",
      profileBefore: {},
      profileAfter: { bodyRelationship: "connected" },
      catalog,
      userTier: TIER.FREE,
    });
    expect(wrongAnswer).toEqual([]);

    const rightAnswer = resolveNewlyUnlockedPaths({
      slug: "body",
      profileBefore: {},
      profileAfter: { bodyRelationship: "disconnected" },
      catalog,
      userTier: TIER.FREE,
    });
    expect(rightAnswer).toHaveLength(1);
  });

  it("does not return a path already unlocked before this completion", () => {
    const catalog = [path({ id: "p3", triggerSignals: "prerequisite:module:identity" })];

    const result = resolveNewlyUnlockedPaths({
      slug: "identity",
      profileBefore: { moduleIdentityComplete: true },
      profileAfter: { moduleIdentityComplete: true },
      catalog,
      userTier: TIER.FREE,
    });
    expect(result).toEqual([]);
  });

  it("never returns a path with no prerequisites", () => {
    const catalog = [path({ id: "p4", triggerSignals: "" })];

    const result = resolveNewlyUnlockedPaths({
      slug: "identity",
      profileBefore: {},
      profileAfter: { moduleIdentityComplete: true },
      catalog,
      userTier: TIER.FREE,
    });
    expect(result).toEqual([]);
  });

  it("excludes isActive = false paths", () => {
    const catalog = [
      path({ id: "p5", triggerSignals: "prerequisite:module:identity", isActive: false }),
    ];

    const result = resolveNewlyUnlockedPaths({
      slug: "identity",
      profileBefore: { moduleIdentityComplete: false },
      profileAfter: { moduleIdentityComplete: true },
      catalog,
      userTier: TIER.FREE,
    });
    expect(result).toEqual([]);
  });

  it("marks requiresUpgrade for a path above the user's tier, per OVR-009 show-all policy", () => {
    const catalog = [
      path({ id: "p6", triggerSignals: "prerequisite:module:identity", tier: TIER.PRO }),
    ];

    const result = resolveNewlyUnlockedPaths({
      slug: "identity",
      profileBefore: { moduleIdentityComplete: false },
      profileAfter: { moduleIdentityComplete: true },
      catalog,
      userTier: TIER.FREE,
    });
    expect(result).toHaveLength(1);
    expect(result[0].requiresUpgrade).toBe(true);
  });

  it("returns a stable, name-sorted result so snapshots do not flake", () => {
    const catalog = [
      path({ id: "b", name: "Beta path", triggerSignals: "prerequisite:module:identity" }),
      path({ id: "a", name: "Alpha path", triggerSignals: "prerequisite:module:identity" }),
    ];

    const result = resolveNewlyUnlockedPaths({
      slug: "identity",
      profileBefore: { moduleIdentityComplete: false },
      profileAfter: { moduleIdentityComplete: true },
      catalog,
      userTier: TIER.FREE,
    });
    expect(result.map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});
