import {
  MODULE_ANSWER_FIELD_COLUMNS,
  MODULE_FIELD_ONBOARDING_ALIASES,
  type ModuleAnswerFieldKey,
} from "@/lib/modules/moduleFieldKeys";
import {
  isModuleComplete,
  type ModuleProfileInput,
} from "@/lib/modules/readModuleProfile";
import {
  MODULE_DISPLAY_TITLES,
  MODULE_SLUGS,
  type ModuleSlug,
} from "@/lib/modules/moduleSlugs";

const PREREQUISITE_PREFIX = "prerequisite:";

export type PathModulePrerequisite =
  | { kind: "module_complete"; slug: ModuleSlug }
  | { kind: "field_equals"; fieldKey: ModuleAnswerFieldKey; value: string }
  | { kind: "field_gte"; fieldKey: ModuleAnswerFieldKey; min: number };

export type PathModuleGate = {
  blocked: true;
  headline: string;
  detail?: string;
  ctaLabel: string;
  ctaHref: string;
  primaryModuleSlug: ModuleSlug;
};

function isModuleSlug(value: string): value is ModuleSlug {
  return (MODULE_SLUGS as readonly string[]).includes(value);
}

function isModuleAnswerFieldKey(value: string): value is ModuleAnswerFieldKey {
  return value in MODULE_ANSWER_FIELD_COLUMNS;
}

function readProfileFieldValue(
  profile: ModuleProfileInput,
  fieldKey: ModuleAnswerFieldKey,
): string | number | boolean | null {
  const column = MODULE_ANSWER_FIELD_COLUMNS[fieldKey];
  const columnValue = profile[column as keyof ModuleProfileInput];
  if (columnValue !== null && columnValue !== undefined) {
    return columnValue as string | number | boolean;
  }

  const alias = MODULE_FIELD_ONBOARDING_ALIASES[fieldKey];
  if (!alias) return null;

  const onboardingData =
    profile.onboardingData && typeof profile.onboardingData === "object"
      ? profile.onboardingData
      : null;
  if (!onboardingData) return null;

  const raw = onboardingData[alias];
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return raw;
  }
  return null;
}

function parsePrerequisiteSegment(segment: string): PathModulePrerequisite | null {
  const trimmed = segment.trim();
  if (!trimmed.toLowerCase().startsWith(PREREQUISITE_PREFIX)) return null;

  const body = trimmed.slice(PREREQUISITE_PREFIX.length).trim();

  if (body.toLowerCase().startsWith("module:")) {
    const slug = body.slice("module:".length).trim();
    if (!isModuleSlug(slug)) return null;
    return { kind: "module_complete", slug };
  }

  if (body.toLowerCase().startsWith("field:")) {
    const fieldBody = body.slice("field:".length).trim();
    const gteIndex = fieldBody.indexOf(">=");
    if (gteIndex >= 0) {
      const fieldKey = fieldBody.slice(0, gteIndex).trim();
      const minRaw = fieldBody.slice(gteIndex + 2).trim();
      const min = Number(minRaw);
      if (!isModuleAnswerFieldKey(fieldKey) || !Number.isFinite(min)) return null;
      return { kind: "field_gte", fieldKey, min };
    }

    const eqIndex = fieldBody.indexOf("=");
    if (eqIndex >= 0) {
      const fieldKey = fieldBody.slice(0, eqIndex).trim();
      const value = fieldBody.slice(eqIndex + 1).trim();
      if (!isModuleAnswerFieldKey(fieldKey) || !value) return null;
      return { kind: "field_equals", fieldKey, value };
    }
  }

  return null;
}

export function parsePathModulePrerequisites(
  triggerSignals: string | null | undefined,
): PathModulePrerequisite[] {
  if (!triggerSignals?.trim()) return [];

  return triggerSignals
    .split(";")
    .map(parsePrerequisiteSegment)
    .filter((item): item is PathModulePrerequisite => item !== null);
}

export function userMeetsPathModulePrerequisite(
  profile: ModuleProfileInput,
  prerequisite: PathModulePrerequisite,
): boolean {
  switch (prerequisite.kind) {
    case "module_complete":
      return isModuleComplete(profile, prerequisite.slug);
    case "field_equals": {
      const raw = readProfileFieldValue(profile, prerequisite.fieldKey);
      if (raw === null) return false;
      return String(raw).trim().toLowerCase() === prerequisite.value.trim().toLowerCase();
    }
    case "field_gte": {
      const raw = readProfileFieldValue(profile, prerequisite.fieldKey);
      if (raw === null) return false;
      const numeric = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(numeric) && numeric >= prerequisite.min;
    }
    default: {
      const exhaustive: never = prerequisite;
      return exhaustive;
    }
  }
}

export function userMeetsPathModulePrerequisites(
  profile: ModuleProfileInput,
  prerequisites: PathModulePrerequisite[],
): boolean {
  if (prerequisites.length === 0) return true;
  return prerequisites.every((prerequisite) =>
    userMeetsPathModulePrerequisite(profile, prerequisite),
  );
}

function resolvePrimaryModuleSlug(
  prerequisites: PathModulePrerequisite[],
): ModuleSlug {
  const modulePrereq = prerequisites.find(
    (prerequisite): prerequisite is Extract<PathModulePrerequisite, { kind: "module_complete" }> =>
      prerequisite.kind === "module_complete",
  );
  return modulePrereq?.slug ?? "identity";
}

function buildGateHeadline(primaryModuleSlug: ModuleSlug, hasFieldPrereqs: boolean): string {
  if (primaryModuleSlug === "identity" && !hasFieldPrereqs) {
    return "Complete Identity Lens to unlock this path";
  }

  const title = MODULE_DISPLAY_TITLES[primaryModuleSlug];
  if (hasFieldPrereqs) {
    return `Complete ${title} and meet path requirements to unlock this path`;
  }
  return `Complete ${title} to unlock this path`;
}

export function resolvePathModuleGate(
  profile: ModuleProfileInput,
  triggerSignals: string | null | undefined,
): PathModuleGate | null {
  const prerequisites = parsePathModulePrerequisites(triggerSignals);
  if (prerequisites.length === 0) return null;
  if (userMeetsPathModulePrerequisites(profile, prerequisites)) return null;

  const primaryModuleSlug = resolvePrimaryModuleSlug(prerequisites);
  const hasFieldPrereqs = prerequisites.some(
    (prerequisite) =>
      prerequisite.kind === "field_equals" || prerequisite.kind === "field_gte",
  );

  return {
    blocked: true,
    headline: buildGateHeadline(primaryModuleSlug, hasFieldPrereqs),
    ctaLabel: `Complete ${MODULE_DISPLAY_TITLES[primaryModuleSlug]}`,
    ctaHref: `/settings/know-yourself/${primaryModuleSlug}`,
    primaryModuleSlug,
  };
}

export function pathHasModulePrerequisites(
  triggerSignals: string | null | undefined,
): boolean {
  return parsePathModulePrerequisites(triggerSignals).length > 0;
}
