import {
  ADAPTIVE_GUIDANCE_PROMPT,
  ADAPTIVE_INTELLIGENCE_PROMPT,
  DECISION_INTELLIGENCE_PROMPT,
  DIRECTED_WRITING_PROTOCOL,
  GENERAL_RULES_PROMPT,
  GRIEF_PROTOCOL,
  MASTER_BASE_PROMPT,
  MASTER_PHILOSOPHY_PROMPT,
  RECOVERY_PROTOCOL,
  SAFETY_BOUNDARIES,
  TRADEOFF_ENGINE_PROMPT,
  TRAUMA_PROTOCOL,
  CRISIS_RESPONSE_MANDATORY,
} from "./library.ts";

/** Static prompt layers seedable to promptLibraryLayer (REQ-13). */
export const STATIC_PROMPT_LAYER_ENTRIES: Array<{ layerKey: string; content: string; sortOrder: number }> = [
  { layerKey: "master_philosophy", content: MASTER_PHILOSOPHY_PROMPT, sortOrder: 0 },
  { layerKey: "safety_boundaries", content: SAFETY_BOUNDARIES, sortOrder: 1 },
  { layerKey: "master_base", content: MASTER_BASE_PROMPT, sortOrder: 2 },
  { layerKey: "general_rules", content: GENERAL_RULES_PROMPT, sortOrder: 3 },
  { layerKey: "recovery_protocol", content: RECOVERY_PROTOCOL, sortOrder: 8 },
  { layerKey: "grief_protocol", content: GRIEF_PROTOCOL, sortOrder: 9 },
  { layerKey: "trauma_protocol", content: TRAUMA_PROTOCOL, sortOrder: 10 },
  { layerKey: "directed_writing", content: DIRECTED_WRITING_PROTOCOL, sortOrder: 11 },
  { layerKey: "decision_intelligence", content: DECISION_INTELLIGENCE_PROMPT, sortOrder: 20 },
  { layerKey: "adaptive_guidance", content: ADAPTIVE_GUIDANCE_PROMPT, sortOrder: 21 },
  { layerKey: "tradeoff_engine", content: TRADEOFF_ENGINE_PROMPT, sortOrder: 22 },
  { layerKey: "adaptive_intelligence", content: ADAPTIVE_INTELLIGENCE_PROMPT, sortOrder: 23 },
  { layerKey: "crisis_response_mandatory", content: CRISIS_RESPONSE_MANDATORY, sortOrder: 99 },
];

export type PromptLibraryLayerMap = Record<string, string>;

export function buildStaticPromptLayerMap(): PromptLibraryLayerMap {
  const map: PromptLibraryLayerMap = {};
  for (const entry of STATIC_PROMPT_LAYER_ENTRIES) {
    map[entry.layerKey] = entry.content;
  }
  return map;
}

export function resolvePromptLayer(
  layers: PromptLibraryLayerMap | undefined,
  layerKey: string,
  fallback: string,
): string {
  const override = layers?.[layerKey];
  return typeof override === "string" && override.trim() ? override : fallback;
}
