/** REQ-14 — voice session entry CTA for depleted / low-energy users. */

export function isDepletedForVoiceSessionCta(
  onboardingData?: Record<string, unknown> | null,
): boolean {
  const raw = onboardingData?.stateSignals;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;

  const signals = raw as Record<string, unknown>;
  return (
    signals.energy_level_signal === "depleted" ||
    signals.nervous_system_state === "depleted" ||
    signals.nervous_system_state === "shut_down"
  );
}

export const VOICE_SESSION_ROUTE = "/coaching/voice" as const;
