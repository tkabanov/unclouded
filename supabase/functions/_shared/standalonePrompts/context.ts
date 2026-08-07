/** Load classification / coaching mode / flags for standalone prompts. */

import { resolveCoachingModes } from "../../chat/prompt/resolveCoachingModes.ts";
import type { ProfileData } from "../../chat/prompt/types.ts";
import { readSessionMemoryRecords } from "../../chat/sessionMemory/sessionMemoryHelpers.ts";

export type StandaloneUserContext = {
  classification: string;
  coachingMode: string;
  recentThemes: string;
  aiConfidenceLevel: string;
  activeFlags: string;
  sessionCount: number;
  sessionMemoryCompressed: string;
  openCommitment: string;
  commitmentFollowThroughRate: string;
  confirmedFingerprintSignals: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readClassificationName(results: Record<string, unknown>): string {
  const nested = results.classification;
  if (nested && typeof nested === "object") {
    const name = (nested as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  if (typeof results.classification === "string" && results.classification.trim()) {
    return results.classification.trim();
  }
  return "unknown";
}

function capitalizeMode(mode: string): string {
  if (!mode) return "Builder";
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
}

function collectActiveFlags(results: Record<string, unknown>): string {
  const flags: string[] = [];
  if (results.grief_mode_active === true) flags.push("grief_mode");
  if (results.recovery_mode_active === true) flags.push("recovery_mode");
  if (results.high_emotional_load === true || results.high_emotional_load_active === true) {
    flags.push("high_emotional_load");
  }
  if (results.crisis_prone === true) flags.push("crisis_prone");
  return flags.length > 0 ? flags.join(", ") : "none";
}

function resolveAiConfidence(sessionCount: number): string {
  if (sessionCount >= 10) return "Direct";
  if (sessionCount >= 5) return "Guided";
  return "Exploratory";
}

/**
 * Prompt 1 recent_themes: up to 3 themes from the last 2 session summaries,
 * or "none" if fewer than 2 sessions completed.
 */
export function recentThemesFromSessionMemory(
  records: Array<{ topic?: string | null; summaryStub?: string | null }>,
): string {
  if (records.length < 2) return "none";
  const themes = records
    .slice(-2)
    .map((r) => r.topic?.trim() || r.summaryStub?.trim() || "")
    .filter(Boolean)
    .slice(0, 3);
  return themes.length > 0 ? themes.join(", ") : "none";
}

function compressSessionThemes(
  onboardingData: Record<string, unknown>,
  maxChars: number,
): { themes: string; compressed: string; sessionCount: number; openCommitment: string } {
  const records = readSessionMemoryRecords(onboardingData);
  const sessionCount = records.length;
  const recent = records.slice(-5);
  const themes = recentThemesFromSessionMemory(records);
  const compressedParts = recent.map((r) => {
    const bits = [r.topic, r.summaryStub, r.keyPatternOrInsight].filter(
      (v): v is string => typeof v === "string" && Boolean(v.trim()),
    );
    return `- ${bits.join(" — ")}`;
  });
  let compressed = compressedParts.join("\n");
  if (compressed.length > maxChars) {
    compressed = compressed.slice(0, maxChars - 1) + "…";
  }

  let openCommitment = "none";
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const c = records[i]?.microCommitment?.trim();
    if (c) {
      openCommitment = c;
      break;
    }
  }

  return {
    themes,
    compressed: compressed || "none",
    sessionCount,
    openCommitment,
  };
}

function readFingerprintSignals(results: Record<string, unknown>): string {
  const raw =
    results.confirmed_fingerprint_signals ??
    results.fingerprint_signals ??
    results.confirmedFingerprintSignals;
  if (Array.isArray(raw)) {
    const names = raw
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry && typeof entry === "object") {
          const name = (entry as Record<string, unknown>).name;
          return typeof name === "string" ? name.trim() : "";
        }
        return "";
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "none";
  }
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "none";
}

function readFollowThroughRate(onboardingData: Record<string, unknown>): string {
  const raw =
    onboardingData.commitment_followthrough_rate ??
    onboardingData.commitmentFollowThroughRate;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `${Math.round(raw)}%`;
  }
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "insufficient data";
}

export function buildStandaloneUserContext(profile: {
  results?: unknown;
  onboardingData?: unknown;
}): StandaloneUserContext {
  const results = asRecord(profile.results);
  const onboardingData = asRecord(profile.onboardingData);
  const modes = resolveCoachingModes({
    results,
    onboardingData,
  } as ProfileData);
  const memory = compressSessionThemes(onboardingData, 2400);

  return {
    classification: readClassificationName(results),
    coachingMode: capitalizeMode(modes.primary),
    recentThemes: memory.themes,
    aiConfidenceLevel: resolveAiConfidence(memory.sessionCount),
    activeFlags: collectActiveFlags(results),
    sessionCount: memory.sessionCount,
    sessionMemoryCompressed: memory.compressed,
    openCommitment: memory.openCommitment,
    commitmentFollowThroughRate: readFollowThroughRate(onboardingData),
    confirmedFingerprintSignals: readFingerprintSignals(results),
  };
}

export function scoreFromResults(
  results: Record<string, unknown>,
  key: "stability_score" | "performance_score" | "alignment_score",
): number | null {
  const value = results[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
