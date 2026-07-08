import {
  AI_COACHING_MODE,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { CLASSIFICATION_OS, type ClassificationOsSlug } from "./classifyUser";

export interface AiCoachingModeInput {
  classification_os?: string | null;
  pressure_profile_text?: string | null;
  behavioral_fingerprint_text?: string | null;
}

function modesForClassification(classificationOs: ClassificationOsSlug | null): AiCoachingModeSlug[] {
  switch (classificationOs) {
    case CLASSIFICATION_OS.CAPACITY_EROSION:
    case CLASSIFICATION_OS.HIGH_OUTPUT_HIDDEN_INSTABILITY:
      return [AI_COACHING_MODE.STABILIZER, AI_COACHING_MODE.PROTECTOR];
    case CLASSIFICATION_OS.PERFORMANCE_STAGNATION:
      return [AI_COACHING_MODE.STRATEGIST, AI_COACHING_MODE.SIMPLIFIER];
    case CLASSIFICATION_OS.ALIGNMENT_FRACTURE:
      return [AI_COACHING_MODE.REBUILDER, AI_COACHING_MODE.SIMPLIFIER];
    case CLASSIFICATION_OS.OPTIMIZATION_READY:
    case CLASSIFICATION_OS.BUILDING_MOMENTUM:
      return [AI_COACHING_MODE.STRATEGIST, AI_COACHING_MODE.REBUILDER];
    case CLASSIFICATION_OS.COMFORTABLE_PLATEAU:
      return [AI_COACHING_MODE.SIMPLIFIER, AI_COACHING_MODE.REBUILDER];
    default:
      return [AI_COACHING_MODE.STABILIZER, AI_COACHING_MODE.SIMPLIFIER];
  }
}

/** Bubble API event calculate_user_ai_coaching_mode (bTIEN) branch resolver. */
export function resolveAiCoachingModes(input: AiCoachingModeInput): AiCoachingModeSlug[] {
  const classificationOs = (input.classification_os ?? null) as ClassificationOsSlug | null;
  let modes = modesForClassification(classificationOs);

  const pressure = input.pressure_profile_text ?? "";
  if (pressure === "System Overload" && !modes.includes(AI_COACHING_MODE.PROTECTOR)) {
    modes = [AI_COACHING_MODE.PROTECTOR, ...modes];
  }

  const fingerprint = (input.behavioral_fingerprint_text ?? "").toLowerCase();
  if (fingerprint.includes("overwhelm") && !modes.includes(AI_COACHING_MODE.STABILIZER)) {
    modes = [AI_COACHING_MODE.STABILIZER, ...modes];
  }

  const unique = [...new Set(modes)];
  return unique.length > 0 ? unique : [AI_COACHING_MODE.SIMPLIFIER];
}
