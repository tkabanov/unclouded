import { describe, expect, it } from "vitest";

import { MODULE_ANSWER_FIELDS_BY_SLUG } from "./moduleFieldKeys";
import {
  getAllModuleDefinitions,
  getModuleDefinition,
  getPersistedQuestions,
  mapAnswersToProfileFields,
  resolveModuleSideEffects,
  validateModuleAnswers,
  validateRegistryFieldCoverage,
} from "./moduleConfigApi";
import { MODULE_SLUGS, type ModuleSlug } from "./moduleSlugs";

describe("moduleRegistry", () => {
  it("covers all six module slugs exhaustively", () => {
    expect(getAllModuleDefinitions()).toHaveLength(6);
    for (const slug of MODULE_SLUGS) {
      expect(getModuleDefinition(slug).slug).toBe(slug);
    }

    const switchCoverage = (slug: ModuleSlug): string => {
      switch (slug) {
        case "identity":
        case "relational":
        case "history":
        case "financial":
        case "body":
        case "meaning":
          return getModuleDefinition(slug).displayTitle;
        default: {
          const neverSlug: never = slug;
          throw new Error(`Unhandled slug: ${neverSlug}`);
        }
      }
    };

    for (const slug of MODULE_SLUGS) {
      expect(switchCoverage(slug)).toBeTruthy();
    }
  });

  it("maps every persisted field key to a question or side effect", () => {
    expect(() => validateRegistryFieldCoverage()).not.toThrow();
    for (const slug of MODULE_SLUGS) {
      const fieldKeys = new Set(
        getPersistedQuestions(slug)
          .map((question) => question.fieldKey)
          .filter((fieldKey) => fieldKey !== null),
      );
      for (const expectedField of MODULE_ANSWER_FIELDS_BY_SLUG[slug]) {
        const coveredByQuestion = fieldKeys.has(expectedField);
        const sideEffectFields =
          slug === "meaning"
            ? expectedField === "spiritualFrameworkPresent"
            : slug === "body"
              ? expectedField === "hormonalContextFlag"
              : false;
        expect(coveredByQuestion || sideEffectFields).toBe(true);
      }
    }
  });

  it("has no orphan field keys on questions", () => {
    const allKnownFields = new Set(
      Object.values(MODULE_ANSWER_FIELDS_BY_SLUG).flat(),
    );
    for (const definition of getAllModuleDefinitions()) {
      for (const question of definition.questions) {
        if (question.fieldKey !== null) {
          expect(allKnownFields.has(question.fieldKey)).toBe(true);
        }
      }
    }
  });

  it("matches Build Brief question counts", () => {
    const counts: Record<ModuleSlug, number> = {
      identity: 8,
      relational: 8,
      history: 6,
      financial: 5,
      body: 7,
      meaning: 7,
    };
    for (const slug of MODULE_SLUGS) {
      expect(getModuleDefinition(slug).questions).toHaveLength(counts[slug]);
    }
  });

  it("marks history as high sensitivity", () => {
    expect(getModuleDefinition("history").sensitivityTier).toBe("high");
  });

  it("rejects partial identity answers", () => {
    const result = validateModuleAnswers("identity", {
      iq1: "performance_based",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingQuestionIds.length).toBeGreaterThan(0);
    }
  });

  it("accepts full identity fixture and maps fields", () => {
    const answers = {
      iq1: "performance_based",
      iq2: "growth",
      iq3: "3",
      iq4: "self_set",
    };

    const validation = validateModuleAnswers("identity", answers);
    expect(validation.ok).toBe(true);

    const mapped = mapAnswersToProfileFields("identity", answers);
    expect(mapped.identitySelfWorthSource).toBe("performance_based");
    expect(mapped.identityNarrativeType).toBe("growth");
    expect(mapped.identityRoleFusionScore).toBe("3");
    expect(mapped.identityPressureOrigin).toBe("self_set");

    const sideEffects = resolveModuleSideEffects("identity", answers);
    expect(sideEffects.profileFields).toEqual({});
    expect(sideEffects.resultsPatch).toEqual({});
  });

  it("resolves history trauma side effect when activation is active", () => {
    const answers = {
      hq1: "active",
      hq2: "moderate",
      hq3: ["major_loss"],
      hq4: "therapy",
    };
    expect(validateModuleAnswers("history", answers).ok).toBe(true);
    const sideEffects = resolveModuleSideEffects("history", answers);
    expect(sideEffects.resultsPatch).toEqual({ trauma_informed_mode: true });
  });

  it("derives spiritualFrameworkPresent false when framework type is no", () => {
    const answers = {
      mq1: "clear",
      mq2: "no",
      mq3: "strong",
      mq4: "people",
    };
    const sideEffects = resolveModuleSideEffects("meaning", answers);
    expect(sideEffects.profileFields.spiritualFrameworkPresent).toBe(false);
  });

  it("derives hormonalContextFlag from body BQ3 answer", () => {
    const answers = {
      bq1: "good",
      bq2: "no",
      bq3: "yes_perimenopause",
      bq4: "connected",
      bq5: "none",
    };
    const sideEffects = resolveModuleSideEffects("body", answers);
    expect(sideEffects.profileFields.hormonalContextFlag).toBe(true);
  });

  it("returns identity definition gate payload", () => {
    const definition = getModuleDefinition("identity");
    expect(definition.questions).toHaveLength(8);
    expect(getPersistedQuestions("identity")).toHaveLength(4);
    expect(definition.headline).toBeTruthy();
    expect(definition.sub).toBeTruthy();
    expect(definition.presentationCopy).toBeTruthy();
    expect(definition.aiShortName).toBe("Identity Lens");
  });
});
