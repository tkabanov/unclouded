import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getModuleAvailability } from "./moduleScheduler";
import type { ModuleAvailabilityStatus } from "./moduleSchedulerTypes";
import { MODULE_SLUGS } from "./moduleSlugs";
import type { ModuleProfileInput } from "./readModuleProfile";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readModuleSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), "utf-8");
}

const MODULE_ENTRY_SOURCES = [
  "completeModule.ts",
  "moduleScheduler.ts",
  "moduleRefresh.ts",
  "moduleRefreshApi.ts",
] as const;

describe("module tier gating (OVR-009 regression)", () => {
  it("module availability statuses never include tier lock", () => {
    const statuses: ModuleAvailabilityStatus[] = [
      "locked",
      "available",
      "completed",
      "refresh_available",
    ];
    expect(statuses).not.toContain("tier_locked");
  });

  it("module entry points do not import tier gate helpers", () => {
    for (const file of MODULE_ENTRY_SOURCES) {
      const source = readModuleSource(file);
      expect(source).not.toMatch(/tierGateHelpers/);
      expect(source).not.toMatch(/tierGate\.ts/);
    }
  });

  it("free-tier profile gets available (not tier-blocked) when unlock day has passed", () => {
    const pastUnlock = "2020-01-01T00:00:00.000Z";
    const profile: ModuleProfileInput = {
      modulesCompletedCount: 0,
      moduleSchedules: Object.fromEntries(
        MODULE_SLUGS.map((slug) => [
          slug,
          { scheduledAt: pastUnlock, unlockedAt: null, completedAt: null },
        ]),
      ),
      onboardingData: {
        tier: "free",
        subscribed: false,
      },
    };

    const availability = getModuleAvailability(profile, new Date("2026-07-17T12:00:00.000Z"));

    for (const slug of MODULE_SLUGS) {
      expect(availability[slug].status).toBe("available");
    }
  });
});
