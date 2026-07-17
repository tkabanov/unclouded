import { describe, expect, it } from "vitest";
import {
  parsePathModulePrerequisites,
  resolvePathModuleGate,
  userMeetsPathModulePrerequisites,
} from "./pathModulePrerequisites";

describe("parsePathModulePrerequisites", () => {
  it("parses module and field tokens from triggerSignals", () => {
    expect(
      parsePathModulePrerequisites(
        "enrollment:onboarding; prerequisite:module:identity; prerequisite:field:identityNarrativeType=fixed; prerequisite:field:identityRoleFusionScore>=4",
      ),
    ).toEqual([
      { kind: "module_complete", slug: "identity" },
      { kind: "field_equals", fieldKey: "identityNarrativeType", value: "fixed" },
      { kind: "field_gte", fieldKey: "identityRoleFusionScore", min: 4 },
    ]);
  });

  it("returns empty array when no prerequisite tokens exist", () => {
    expect(
      parsePathModulePrerequisites("enrollment:onboarding; flag:None"),
    ).toEqual([]);
  });
});

describe("userMeetsPathModulePrerequisites", () => {
  it("requires all prerequisites to pass", () => {
    const prerequisites = parsePathModulePrerequisites(
      "prerequisite:module:identity; prerequisite:field:identityNarrativeType=fixed",
    );

    expect(
      userMeetsPathModulePrerequisites(
        {
          moduleIdentityComplete: true,
          identityNarrativeType: "growth",
        },
        prerequisites,
      ),
    ).toBe(false);

    expect(
      userMeetsPathModulePrerequisites(
        {
          moduleIdentityComplete: true,
          identityNarrativeType: "fixed",
        },
        prerequisites,
      ),
    ).toBe(true);
  });

  it("evaluates numeric gte field prerequisites", () => {
    const prerequisites = parsePathModulePrerequisites(
      "prerequisite:field:identityRoleFusionScore>=4",
    );

    expect(
      userMeetsPathModulePrerequisites({ identityRoleFusionScore: 3 }, prerequisites),
    ).toBe(false);
    expect(
      userMeetsPathModulePrerequisites({ identityRoleFusionScore: 4 }, prerequisites),
    ).toBe(true);
  });
});

describe("resolvePathModuleGate", () => {
  it("returns identity headline when identity module is missing", () => {
    const gate = resolvePathModuleGate(
      { moduleIdentityComplete: false },
      "prerequisite:module:identity",
    );

    expect(gate).toEqual({
      blocked: true,
      headline: "Complete Identity Lens to unlock this path",
      ctaLabel: "Complete The Identity Lens",
      ctaHref: "/settings/know-yourself/identity",
      primaryModuleSlug: "identity",
    });
  });

  it("returns null when prerequisites are satisfied", () => {
    expect(
      resolvePathModuleGate(
        { moduleIdentityComplete: true },
        "prerequisite:module:identity",
      ),
    ).toBeNull();
  });

  it("includes field requirement detail in headline", () => {
    const gate = resolvePathModuleGate(
      {
        moduleIdentityComplete: true,
        identityNarrativeType: "growth",
      },
      "prerequisite:module:identity; prerequisite:field:identityNarrativeType=fixed",
    );

    expect(gate?.headline).toBe(
      "Complete The Identity Lens and meet path requirements to unlock this path",
    );
  });
});
