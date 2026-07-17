import { getLoadSignalAnswerMeta } from "@/lib/enums/onboardingQuestions";

import { MODULE_DEFAULT_UNLOCK_DAYS } from "./moduleRegistry";
import type { ModuleSchedulerInput } from "./moduleSchedulerTypes";
import { MODULE_SLUGS, type ModuleSlug } from "./moduleSlugs";

/** Tie-break order for onboarding preview when daysUntilUnlock are equal (spec §3). */
export const MODULE_PREVIEW_TIE_ORDER: readonly ModuleSlug[] = [
  "body",
  "identity",
  "financial",
  "relational",
  "history",
  "meaning",
];

type AcceleratedTriggerRule = {
  slug: ModuleSlug;
  acceleratedDay: number;
  matches: (input: ModuleSchedulerInput) => boolean;
};

function loadSignalIsHigh(field: string, loadSignals: Record<string, string>): boolean {
  const slug = loadSignals[field];
  if (!slug) return false;
  return getLoadSignalAnswerMeta(slug)?.intensity === "high";
}

/**
 * Body §10: energy depleted OR nervous system depleted/shut_down.
 * UI stores shut_down on nervous_system_state; depleted appears on both signals.
 */
function bodyAcceleratedMatches(input: ModuleSchedulerInput): boolean {
  const { stateSignals } = input;
  return (
    stateSignals.energy_level_signal === "depleted" ||
    stateSignals.nervous_system_state === "depleted" ||
    stateSignals.nervous_system_state === "shut_down"
  );
}

function identityAcceleratedMatches(input: ModuleSchedulerInput): boolean {
  const performance = input.performanceScores.performance_score ?? 3;
  const pattern = input.behavioralPatterns.pressure_response_pattern;
  return performance < 3.2 && (pattern === "overthink" || pattern === "avoid");
}

const ACCELERATED_TRIGGER_RULES: readonly AcceleratedTriggerRule[] = [
  { slug: "body", acceleratedDay: 3, matches: bodyAcceleratedMatches },
  { slug: "identity", acceleratedDay: 5, matches: identityAcceleratedMatches },
  {
    slug: "financial",
    acceleratedDay: 0,
    matches: (input) => loadSignalIsHigh("financial_load_signal", input.loadSignals),
  },
  {
    slug: "relational",
    acceleratedDay: 7,
    matches: (input) => loadSignalIsHigh("relational_load_signal", input.loadSignals),
  },
  {
    slug: "history",
    acceleratedDay: 10,
    matches: (input) => {
      const stability = input.stabilityScores.stability_score ?? 3;
      return stability < 3.2 || input.healthFlags.grief_mode_active === true;
    },
  },
  {
    slug: "meaning",
    acceleratedDay: 14,
    matches: (input) => (input.alignmentScores.alignment_score ?? 3) < 3.2,
  },
];

const RULES_BY_SLUG: Record<ModuleSlug, AcceleratedTriggerRule | undefined> = Object.fromEntries(
  ACCELERATED_TRIGGER_RULES.map((rule) => [rule.slug, rule]),
) as Record<ModuleSlug, AcceleratedTriggerRule | undefined>;

export function isAcceleratedTriggerActive(slug: ModuleSlug, input: ModuleSchedulerInput): boolean {
  const rule = RULES_BY_SLUG[slug];
  return rule ? rule.matches(input) : false;
}

export function resolveUnlockDay(slug: ModuleSlug, input: ModuleSchedulerInput): number {
  const defaultDay = MODULE_DEFAULT_UNLOCK_DAYS[slug];
  const rule = RULES_BY_SLUG[slug];
  if (rule && rule.matches(input)) {
    return Math.min(defaultDay, rule.acceleratedDay);
  }
  return defaultDay;
}

export function resolveAllUnlockDays(input: ModuleSchedulerInput): Record<ModuleSlug, number> {
  const days = {} as Record<ModuleSlug, number>;
  for (const slug of MODULE_SLUGS) {
    days[slug] = resolveUnlockDay(slug, input);
  }
  return days;
}
