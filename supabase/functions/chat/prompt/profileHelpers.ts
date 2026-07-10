import type { AiConfidenceLevel, ProfileData } from "./types.ts";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function asNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asNumberText(value: unknown): string {
  const n = asNumberValue(value);
  return n === null ? "unknown" : String(n);
}

export function asBooleanText(value: unknown): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

export function readNestedString(
  record: Record<string, unknown>,
  path: string[],
  fallback = "unknown",
): string {
  let current: unknown = record;
  for (const key of path) {
    current = asRecord(current)[key];
  }
  return asString(current, fallback);
}

export function readOnboardingGroup(
  onboardingData: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return asRecord(onboardingData[key]);
}

export function isHighLoad(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized === "high" ||
    normalized.includes("high") ||
    normalized.includes("overwhelming")
  );
}

export function resolveAiConfidenceLevel(modulesCompleted: number): AiConfidenceLevel {
  if (modulesCompleted <= 0) return "exploratory";
  if (modulesCompleted <= 2) return "exploratory+";
  if (modulesCompleted <= 4) return "guided";
  return "direct";
}

export function readModulesCompletedCount(onboardingData: Record<string, unknown>): number {
  const raw =
    onboardingData.modules_completed_count_number ??
    onboardingData.modules_completed_count ??
    0;
  const n = asNumberValue(raw);
  return n === null ? 0 : Math.max(0, Math.floor(n));
}

const MODULE_FLAG_MAP: Array<{ flagKeys: string[]; name: string }> = [
  { flagKeys: ["module_identity_complete", "module_identity_complete_boolean"], name: "Identity Lens" },
  {
    flagKeys: ["module_relational_complete", "module_relational_complete_boolean"],
    name: "Relational Blueprint",
  },
  {
    flagKeys: ["module_history_complete", "module_history_complete_boolean"],
    name: "History & Context",
  },
  {
    flagKeys: ["module_financial_complete", "module_financial_complete_boolean"],
    name: "Financial Reality",
  },
  { flagKeys: ["module_body_complete", "module_body_complete_boolean"], name: "Body's Story" },
  {
    flagKeys: ["module_meaning_complete", "module_meaning_complete_boolean", "module_holds_you_complete"],
    name: "What Holds You",
  },
];

const MODULE_ORDER = [
  "Identity Lens",
  "Relational Blueprint",
  "History & Context",
  "Financial Reality",
  "Body's Story",
  "What Holds You",
] as const;

/**
 * Resolve completed module names from explicit flags/lists when present.
 * If only a count is available, map the first N modules in unlock order —
 * honest about approximation via a note in the block builder.
 */
export function resolveCompletedModules(
  onboardingData: Record<string, unknown>,
  modulesCompletedCount: number,
): { names: string[]; inferredFromCountOnly: boolean } {
  const named: string[] = [];

  const list =
    onboardingData.modules_completed_list ??
    onboardingData.modules_completed ??
    onboardingData.completed_modules;
  if (Array.isArray(list)) {
    for (const item of list) {
      if (typeof item === "string" && item.trim()) named.push(item.trim());
    }
  }

  for (const entry of MODULE_FLAG_MAP) {
    const hit = entry.flagKeys.some((key) => onboardingData[key] === true);
    if (hit && !named.includes(entry.name)) named.push(entry.name);
  }

  if (named.length > 0) {
    return { names: named, inferredFromCountOnly: false };
  }

  if (modulesCompletedCount > 0) {
    return {
      names: MODULE_ORDER.slice(0, Math.min(modulesCompletedCount, MODULE_ORDER.length)),
      inferredFromCountOnly: true,
    };
  }

  return { names: [], inferredFromCountOnly: false };
}

export function findFingerprintModifier(
  fingerprint: string,
  modifiers: Record<string, string>,
): string | null {
  if (!fingerprint || fingerprint === "unknown") return null;
  const match = Object.entries(modifiers).find(([key]) => fingerprint.includes(key));
  return match?.[1] ?? null;
}

export function classificationKeyFromProfile(profile: ProfileData): string {
  const results = asRecord(profile.results);
  const key = readNestedString(results, ["classification", "key"], "");
  if (key && key !== "unknown") return key;

  const name = readNestedString(results, ["classification", "name"], "");
  if (!name || name === "unknown") return "";

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function substitutePlaceholders(
  text: string,
  values: { fingerprint: string; tradeoff: string },
): string {
  return text
    .split("[BEHAVIORAL_FINGERPRINT]")
    .join(values.fingerprint || "unknown")
    .split("[TRADEOFF_STATEMENT]")
    .join(values.tradeoff || "unknown");
}

/** Strip control chars / prompt-breakers from untrusted client profile strings. */
export function sanitizePromptField(value: unknown, maxLen = 200): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/---+/g, "—")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function sanitizeDisplayName(value: unknown): string {
  const cleaned = sanitizePromptField(value, 60);
  return cleaned || "the user";
}
