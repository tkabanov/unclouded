/** Scheduling helpers for Prompt 1 daily insights (preferred hour + one deferred retry). */

export const DEFAULT_DAILY_INSIGHTS_PREFERRED_HOUR = 8;
/** Spec: retry once after 30 minutes. */
export const DEFAULT_DAILY_INSIGHTS_RETRY_MS = 30 * 60 * 1000;

export type DailyInsightRetryState = {
  attemptCount: number;
  retryAt: string | null;
};

export function dailyInsightsRetryDelayMs(
  envValue: string | undefined = undefined,
): number {
  let raw = envValue;
  if (raw === undefined) {
    try {
      // Deno edge runtime; guarded for vitest/node imports.
      raw = (globalThis as { Deno?: { env: { get: (k: string) => string | undefined } } })
        .Deno?.env.get("DAILY_INSIGHTS_RETRY_MS");
    } catch {
      raw = undefined;
    }
  }
  if (raw && Number.isFinite(Number(raw))) {
    const n = Number(raw);
    if (n >= 0) return Math.floor(n);
  }
  return DEFAULT_DAILY_INSIGHTS_RETRY_MS;
}

export function preferredInsightHour(onboardingData: unknown): number {
  if (!onboardingData || typeof onboardingData !== "object") {
    return DEFAULT_DAILY_INSIGHTS_PREFERRED_HOUR;
  }
  const raw = onboardingData as Record<string, unknown>;
  const value =
    raw.preferred_insight_hour ??
    raw.preferredInsightHour ??
    raw.kota_insight_hour;
  if (typeof value === "number" && value >= 0 && value <= 23) return Math.floor(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 23) return Math.floor(parsed);
  }
  return DEFAULT_DAILY_INSIGHTS_PREFERRED_HOUR;
}

export function shouldGenerateDailyInsights(input: {
  localHour: number;
  preferredHour: number;
  hasInsightToday: boolean;
  retry: DailyInsightRetryState | null;
  nowMs?: number;
}): { run: boolean; isRetry: boolean } {
  if (input.hasInsightToday) return { run: false, isRetry: false };

  const attemptCount = input.retry?.attemptCount ?? 0;
  if (attemptCount >= 2) return { run: false, isRetry: false };

  const nowMs = input.nowMs ?? Date.now();
  const retryAtRaw = input.retry?.retryAt ?? null;
  const retryAtMs = retryAtRaw ? Date.parse(retryAtRaw) : NaN;
  const retryDue =
    attemptCount === 1 && Number.isFinite(retryAtMs) && retryAtMs <= nowMs;

  if (retryDue) return { run: true, isRetry: true };

  // Waiting for scheduled retry — do not re-fire on preferred hour.
  if (attemptCount === 1 && Number.isFinite(retryAtMs) && retryAtMs > nowMs) {
    return { run: false, isRetry: false };
  }

  if (input.localHour === input.preferredHour && attemptCount === 0) {
    return { run: true, isRetry: false };
  }

  return { run: false, isRetry: false };
}

/** Keep today + prior 6 local dates (7 rolling days). */
export function dailyInsightPruneBeforeDate(localDateYmd: string): string {
  const d = new Date(`${localDateYmd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 6);
  return d.toISOString().slice(0, 10);
}
