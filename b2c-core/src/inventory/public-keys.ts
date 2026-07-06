import type { JsonValue } from "../types.js";
import { getRecord, toPointer } from "../utils/index.js";

type MatchSource = "suffix_pattern" | "prefix_pattern" | "plugin_scoped";

export interface PublicIntegrationKeyMatch {
  key: string;
  pointer: string;
  value: string;
  suffix: string;
  match_source: MatchSource;
  plugin_id_ref?: string;
}

export interface SuspiciousPublicIntegrationKeyIssue {
  key: string;
  pointer: string;
  reason: "denylisted_suffix";
  denylist_suffix: string;
  plugin_id_ref?: string;
}

export interface PublicIntegrationKeyScanResult {
  matches: PublicIntegrationKeyMatch[];
  suspicious_matches: SuspiciousPublicIntegrationKeyIssue[];
}

const SUFFIX_PATTERNS = [
  "_public_key_live",
  "_public_key_test",
  "_client_id_live",
  "_client_id_test",
  "_site_key",
  "_publishable_key",
] as const;

const PREFIX_PATTERNS = [
  "stripe_",
  "facebook_meta_tag_",
  "recaptcha_",
  "google_maps_",
  "mapbox_",
] as const;

const SUSPICIOUS_SUFFIXES = [
  "_secret",
  "_private",
  "_token",
  "_password",
  "_api_key",
  "_apikey",
  "_secret_key",
  "_signing_key",
] as const;

const COSMETIC_SUFFIXES = [
  "_installed_version",
  "_checkout_image",
  "_checkout_name",
  "_checkout_version",
] as const;

function deriveSuffix(key: string): string {
  const index = key.lastIndexOf("_");
  return index >= 0 ? key.slice(index) : key;
}

function resolvePluginScope(key: string, pluginIds: string[]): string | null {
  const sorted = [...pluginIds].sort((a, b) => {
    if (a.length !== b.length) {
      return b.length - a.length;
    }
    return a.localeCompare(b);
  });
  for (const pluginId of sorted) {
    if (key.startsWith(`${pluginId}_`)) {
      return pluginId;
    }
  }
  return null;
}

export function scanPublicIntegrationKeys(
  clientSafe: Record<string, JsonValue>,
  pointerPrefix: string[],
): PublicIntegrationKeyScanResult {
  const plugins = getRecord(clientSafe.plugins) ?? {};
  const pluginIds = Object.keys(plugins).sort();
  const matches: PublicIntegrationKeyMatch[] = [];
  const suspiciousMatches: SuspiciousPublicIntegrationKeyIssue[] = [];

  for (const key of Object.keys(clientSafe).sort()) {
    const rawValue = clientSafe[key];
    if (typeof rawValue !== "string") {
      continue;
    }
    const pointer = toPointer([...pointerPrefix, key]);
    const pluginIdRef = resolvePluginScope(key, pluginIds);
    const denylisted = SUSPICIOUS_SUFFIXES.find((suffix) => key.endsWith(suffix));
    if (denylisted) {
      const issue: SuspiciousPublicIntegrationKeyIssue = {
        key,
        pointer,
        reason: "denylisted_suffix",
        denylist_suffix: denylisted,
      };
      if (pluginIdRef !== null) {
        issue.plugin_id_ref = pluginIdRef;
      }
      suspiciousMatches.push(issue);
      continue;
    }
    if (COSMETIC_SUFFIXES.some((suffix) => key.endsWith(suffix))) {
      continue;
    }
    const bySuffix = SUFFIX_PATTERNS.some((suffix) => key.endsWith(suffix));
    const byPrefix = PREFIX_PATTERNS.some((prefix) => key.startsWith(prefix));
    const byPlugin = pluginIdRef !== null;
    if (!(bySuffix || byPrefix || byPlugin)) {
      continue;
    }
    const match: PublicIntegrationKeyMatch = {
      key,
      pointer,
      value: rawValue,
      suffix: deriveSuffix(key),
      match_source: byPlugin ? "plugin_scoped" : bySuffix ? "suffix_pattern" : "prefix_pattern",
    };
    if (pluginIdRef !== null) {
      match.plugin_id_ref = pluginIdRef;
    }
    matches.push(match);
  }

  return {
    matches,
    suspicious_matches: suspiciousMatches,
  };
}
