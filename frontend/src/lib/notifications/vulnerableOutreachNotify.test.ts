import { describe, expect, it } from "vitest";

import {
  buildVulnerableOutreachEmailHtml,
  isInactiveForOutreach,
  isOutreachCooldownExpired,
  isVulnerableProfile,
  listVulnerableOutreachPreCandidatesFromRows,
  VULNERABLE_OUTREACH_COOLDOWN_MS,
  VULNERABLE_OUTREACH_INACTIVE_DAYS,
  VULNERABLE_OUTREACH_MESSAGE,
  type VulnerableOutreachProfileRow,
} from "../../../../supabase/functions/_shared/vulnerableOutreachLogic.ts";

const NOW = Date.parse("2026-07-20T12:00:00.000Z");

function profileRow(
  overrides: Partial<VulnerableOutreachProfileRow> & { id: string },
): VulnerableOutreachProfileRow {
  return {
    email: "user@example.com",
    firstName: "Alex",
    results: { grief_mode_active: true },
    vulnerableOutreachEmailedAt: null,
    onboardingCompletedAt: "2026-07-01T12:00:00.000Z",
    createdAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("vulnerableOutreachLogic", () => {
  it("requires grief or recovery mode", () => {
    expect(isVulnerableProfile({ grief_mode_active: true })).toBe(true);
    expect(isVulnerableProfile({ recovery_mode_active: true })).toBe(true);
    expect(isVulnerableProfile({ grief_mode_active: false, recovery_mode_active: false })).toBe(
      false,
    );
  });

  it("enforces 7-day outreach cooldown", () => {
    const recent = new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOutreachCooldownExpired(recent, NOW)).toBe(false);
    const expired = new Date(NOW - VULNERABLE_OUTREACH_COOLDOWN_MS - 1000).toISOString();
    expect(isOutreachCooldownExpired(expired, NOW)).toBe(true);
    expect(isOutreachCooldownExpired(null, NOW)).toBe(true);
  });

  it("requires ≥10 days since last session or onboarding anchor", () => {
    const recentSession = new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      isInactiveForOutreach({
        lastSessionUpdatedAt: recentSession,
        onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        nowMs: NOW,
      }),
    ).toBe(false);

    const oldSession = new Date(
      NOW - VULNERABLE_OUTREACH_INACTIVE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(
      isInactiveForOutreach({
        lastSessionUpdatedAt: oldSession,
        onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        nowMs: NOW,
      }),
    ).toBe(true);

    expect(
      isInactiveForOutreach({
        lastSessionUpdatedAt: null,
        onboardingCompletedAt: "2026-07-01T12:00:00.000Z",
        createdAt: "2026-07-01T12:00:00.000Z",
        nowMs: NOW,
      }),
    ).toBe(true);
  });

  it("lists pre-candidates by mode + cooldown only", () => {
    const rows = [
      profileRow({ id: "grief-eligible" }),
      profileRow({
        id: "recovery-cooled",
        results: { recovery_mode_active: true },
        vulnerableOutreachEmailedAt: new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      profileRow({
        id: "stable-user",
        results: { grief_mode_active: false, recovery_mode_active: false },
      }),
    ];

    const candidates = listVulnerableOutreachPreCandidatesFromRows(rows, NOW);
    expect(candidates.map((row) => row.id)).toEqual(["grief-eligible"]);
  });

  it("uses REQ-07 copy in email html", () => {
    const html = buildVulnerableOutreachEmailHtml({
      firstName: "Sam",
      appUrl: "https://uncloud360.ai",
    });
    expect(html).toContain(VULNERABLE_OUTREACH_MESSAGE);
    expect(html).toContain("Hi Sam");
  });
});
