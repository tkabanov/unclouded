import { MODULE_ANSWER_FIELDS_BY_SLUG } from "../moduleFieldKeys";
import { readModuleProfileFieldValue } from "../moduleProfileFieldReader";
import type { ModuleSlug } from "../moduleSlugs";
import type { ModuleProfileInput } from "../readModuleProfile";
import { MODULE_RESULTS_CONTENT } from "./moduleResultsContent";

export type ModuleResultsView = {
  headline: string;
  lead: string;
  reflections: string[];
  whatThisUnlocks: string[];
};

function reflectionForValue(
  entries: Record<string, string> | undefined,
  value: string | number | boolean | string[],
): string[] {
  if (!entries) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => entries[item])
      .filter((sentence): sentence is string => Boolean(sentence));
  }

  const sentence = entries[String(value)];
  return sentence ? [sentence] : [];
}

/** Purely-derived qualitative view for a module's persisted answers — no Supabase, no React. */
export function resolveModuleResults(
  slug: ModuleSlug,
  profile: ModuleProfileInput,
): ModuleResultsView {
  const copy = MODULE_RESULTS_CONTENT[slug];
  const fieldKeys = MODULE_ANSWER_FIELDS_BY_SLUG[slug];

  const reflections: string[] = [];
  for (const fieldKey of fieldKeys) {
    const value = readModuleProfileFieldValue(profile, fieldKey);
    if (value === null) continue;
    reflections.push(...reflectionForValue(copy.reflections[fieldKey], value));
  }

  return {
    headline: copy.headline,
    lead: copy.lead,
    reflections,
    whatThisUnlocks: [...copy.whatThisUnlocks],
  };
}
