import { describe, expect, it } from "vitest";

import { getAllModuleDefinitions } from "../moduleConfigApi";
import { MODULE_ANSWER_FIELD_COLUMNS } from "../moduleFieldKeys";
import { MODULE_SLUGS } from "../moduleSlugs";
import { MODULE_RESULTS_CONTENT } from "./moduleResultsContent";
import { resolveModuleResults } from "./resolveModuleResults";

describe("MODULE_RESULTS_CONTENT coverage", () => {
  it("has a reflection entry for every option slug of every persisted question", () => {
    for (const definition of getAllModuleDefinitions()) {
      const copy = MODULE_RESULTS_CONTENT[definition.slug];
      for (const question of definition.questions) {
        if (question.fieldKey === null) continue;
        const entries = copy.reflections[question.fieldKey] ?? {};
        for (const option of question.options) {
          expect(
            entries[option.slug],
            `${definition.slug}.${question.fieldKey}.${option.slug} missing reflection copy`,
          ).toBeTruthy();
        }
      }
    }
  });
});

describe("resolveModuleResults", () => {
  it("returns an empty-reflections view for an empty profile without throwing", () => {
    expect(() => resolveModuleResults("identity", {})).not.toThrow();
    const view = resolveModuleResults("identity", {});
    expect(view.reflections).toEqual([]);
    expect(view.headline).toBeTruthy();
  });

  it("resolves reflections in question declaration order for typed-column answers", () => {
    const view = resolveModuleResults("identity", {
      identitySelfWorthSource: "inherent",
      identityNarrativeType: "growth",
      identityRoleFusionScore: 2,
      identityPressureOrigin: "self_set",
    });

    expect(view.reflections).toEqual([
      MODULE_RESULTS_CONTENT.identity.reflections.identitySelfWorthSource!.inherent,
      MODULE_RESULTS_CONTENT.identity.reflections.identityNarrativeType!.growth,
      MODULE_RESULTS_CONTENT.identity.reflections.identityRoleFusionScore!["2"],
      MODULE_RESULTS_CONTENT.identity.reflections.identityPressureOrigin!.self_set,
    ]);
  });

  it("skips unknown or legacy answer slugs instead of rendering raw text", () => {
    const view = resolveModuleResults("identity", {
      identitySelfWorthSource: "some_removed_legacy_slug",
    });
    expect(view.reflections).toEqual([]);
  });

  it("resolves identically from onboardingData snake_case aliases as from typed columns", () => {
    const fromColumns = resolveModuleResults("relational", {
      attachmentSignal: "secure",
      conflictPattern: "engage",
    });
    const fromOnboarding = resolveModuleResults("relational", {
      onboardingData: {
        attachment_signal: "secure",
        conflict_pattern: "engage",
      },
    });
    expect(fromOnboarding).toEqual(fromColumns);
  });

  it("never surfaces a bare digit for identityRoleFusionScore", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      const view = resolveModuleResults("identity", { identityRoleFusionScore: value });
      for (const sentence of view.reflections) {
        expect(sentence).not.toMatch(new RegExp(`\\b${value}\\b`));
      }
    }
  });

  it("returns no unlocks/history-sensitive block content for a bare history profile", () => {
    const view = resolveModuleResults("history", {});
    expect(view.whatThisUnlocks).toEqual([]);
  });

  it("only exposes documented module answer field columns", () => {
    for (const slug of MODULE_SLUGS) {
      const copy = MODULE_RESULTS_CONTENT[slug];
      for (const fieldKey of Object.keys(copy.reflections)) {
        expect(fieldKey in MODULE_ANSWER_FIELD_COLUMNS).toBe(true);
      }
    }
  });
});
