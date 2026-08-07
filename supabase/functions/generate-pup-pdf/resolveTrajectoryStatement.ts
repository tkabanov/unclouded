import { trajectoryLanguage } from "./trajectoryCopy.ts";

/** Prefer stored Prompt 4 AI text; fall back to static trajectoryLanguage copy. */
export function resolveTrajectoryStatement(
  aiText: unknown,
  trajectoryType: string | null | undefined,
): string | null {
  if (typeof aiText === "string" && aiText.trim()) {
    return aiText.trim();
  }
  return trajectoryLanguage(trajectoryType);
}
