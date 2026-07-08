import { resolveBehavioralFingerprint } from "./buildBehavioralFingerprint";
import { loadProfileRow, patchOnboardingAndResults } from "./profileFieldPatch";

export const BEHAVIORAL_FINGERPRINT_TEXT_FIELD = "behavioral_fingerprint_text" as const;

function readBehavioralPatterns(onboarding: Record<string, unknown>): Record<string, string> {
  const raw = onboarding.behavioralPatterns;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Bubble API event calculate_user_behavioral_fingerprint (bTIDk). */
export async function calculateUserBehavioralFingerprint(userId: string): Promise<string> {
  const { onboarding_data } = await loadProfileRow(userId);
  const patterns = readBehavioralPatterns(onboarding_data);

  const fingerprint = resolveBehavioralFingerprint(
    patterns.pressure_response_pattern ?? "",
    patterns.non_followthrough_reason ?? "",
  );

  await patchOnboardingAndResults(userId, {
    [BEHAVIORAL_FINGERPRINT_TEXT_FIELD]: fingerprint,
  });

  return fingerprint;
}
