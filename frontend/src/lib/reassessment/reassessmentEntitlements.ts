import { TIER, type TierSlug } from "@/lib/enums/tier";
import { NINETY_DAYS_MS } from "@/lib/reassessment";

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface ReassessmentDateContext {
  tier: TierSlug;
  /** First / most recent assessment timestamp. */
  lastAssessmentDate: string | null;
  nextReassessmentDate: string | null;
  /** Fallback when lastAssessmentDate is null (legacy profiles). */
  onboardingCompletedAt?: string | null;
  canReassessOnDemand?: boolean;
  /** Set after first reassessment — unlocks Premium on-demand when tier is Premium. */
  reassessmentCompletedAt?: string | null;
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function resolveAssessmentAnchor(ctx: ReassessmentDateContext): number | null {
  return (
    parseTime(ctx.lastAssessmentDate) ??
    parseTime(ctx.onboardingCompletedAt) ??
    null
  );
}

export function resolveNextReassessmentDueAt(ctx: ReassessmentDateContext): number | null {
  const explicit = parseTime(ctx.nextReassessmentDate);
  if (explicit !== null) return explicit;
  const anchor = resolveAssessmentAnchor(ctx);
  if (anchor === null) return null;
  return anchor + NINETY_DAYS_MS;
}

/** Free: never. Pro/Premium: paid tiers may access when eligible. */
export function isPaidReassessmentTier(tier: TierSlug): boolean {
  return tier === TIER.PRO || tier === TIER.PREMIUM;
}

/** Premium on-demand unlocks after the member's first reassessment. */
export function hasPremiumOnDemandFeature(ctx: ReassessmentDateContext): boolean {
  if (ctx.tier !== TIER.PREMIUM) return false;
  if (ctx.canReassessOnDemand === true) return true;
  return parseTime(ctx.reassessmentCompletedAt) !== null;
}

/**
 * Pro: only when 90-day due date reached.
 * Premium: on-demand after day 30 from last assessment when feature unlocked, or when 90-day due.
 */
export function canAccessReassessment(ctx: ReassessmentDateContext, nowMs = Date.now()): boolean {
  if (!isPaidReassessmentTier(ctx.tier)) return false;

  const anchor = resolveAssessmentAnchor(ctx);
  if (anchor === null) return false;

  if (hasPremiumOnDemandFeature(ctx) && nowMs - anchor >= THIRTY_DAYS_MS) {
    return true;
  }

  const dueAt = resolveNextReassessmentDueAt(ctx);
  if (dueAt === null) return false;
  return nowMs >= dueAt;
}

/** Auto-prompt banner: next reassessment date reached (any paid tier). */
export function isReassessmentDue(ctx: ReassessmentDateContext, nowMs = Date.now()): boolean {
  if (!isPaidReassessmentTier(ctx.tier)) return false;
  const dueAt = resolveNextReassessmentDueAt(ctx);
  if (dueAt === null) return false;
  return nowMs >= dueAt;
}

/**
 * Premium "Reassess now" — active CTA after day 30 since last assessment (when not 90-day due).
 */
export function canShowReassessNow(ctx: ReassessmentDateContext, nowMs = Date.now()): boolean {
  if (!hasPremiumOnDemandFeature(ctx) || isReassessmentDue(ctx, nowMs)) return false;
  const anchor = resolveAssessmentAnchor(ctx);
  if (anchor === null) return false;
  return nowMs - anchor >= THIRTY_DAYS_MS;
}

/**
 * Premium waiting state — show countdown until day 30 after last assessment.
 */
export function canShowPremiumOnDemandLocked(
  ctx: ReassessmentDateContext,
  nowMs = Date.now(),
): boolean {
  if (!hasPremiumOnDemandFeature(ctx) || isReassessmentDue(ctx, nowMs)) return false;
  const anchor = resolveAssessmentAnchor(ctx);
  if (anchor === null) return false;
  return nowMs - anchor < THIRTY_DAYS_MS;
}

export function daysUntilPremiumOnDemand(
  ctx: ReassessmentDateContext,
  nowMs = Date.now(),
): number {
  const anchor = resolveAssessmentAnchor(ctx);
  if (anchor === null) return 30;
  const remaining = THIRTY_DAYS_MS - (nowMs - anchor);
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

export function daysUntilReassessmentDue(
  ctx: ReassessmentDateContext,
  nowMs = Date.now(),
): number {
  const dueAt = resolveNextReassessmentDueAt(ctx);
  if (dueAt === null) return 90;
  return Math.max(0, Math.ceil((dueAt - nowMs) / (24 * 60 * 60 * 1000)));
}

export function addNinetyDaysIso(fromIso: string = new Date().toISOString()): string {
  const t = new Date(fromIso).getTime();
  const base = Number.isNaN(t) ? Date.now() : t;
  return new Date(base + NINETY_DAYS_MS).toISOString();
}
