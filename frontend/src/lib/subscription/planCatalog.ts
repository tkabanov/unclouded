/**
 * Plan card copy for the subscription screen.
 *
 * Feature lists come from the "Subscription Management Card Descriptions"
 * section of `docs/Unclouded _ Individual Subscription Management Flow.md`,
 * which matches the Phase 2 §1 tier matrix.
 *
 * Unresolved: the flow doc's tier summary table says "18 free paths" while its
 * own card description says "3 Free-tier guided coaching paths". The detailed
 * card description wins here until the client confirms the path counts.
 *
 * Prices are NOT defined here — they come from `subscriptionPlanPrice` via
 * `get_my_subscription_overview`, so the yearly amounts stay TBD instead of
 * being derived from the monthly ones.
 */
import { TIER, type TierSlug } from "@/lib/enums/tier";

export type PlanFeature = {
  label: string;
  /** false renders the "not included" marker from the card description. */
  included: boolean;
};

export type PlanCatalogEntry = {
  tier: TierSlug;
  name: string;
  tagline: string;
  badge?: string;
  features: PlanFeature[];
};

function included(...labels: string[]): PlanFeature[] {
  return labels.map((label) => ({ label, included: true }));
}

function excluded(...labels: string[]): PlanFeature[] {
  return labels.map((label) => ({ label, included: false }));
}

export const PLAN_CATALOG: readonly PlanCatalogEntry[] = [
  {
    tier: TIER.FREE,
    name: "Free",
    tagline: "Your full PuP 360 diagnostic, AI coaching, and journal.",
    features: [
      ...included(
        "Complete PuP 360 diagnostic — all 16 questions, full classification",
        "7 AI coaching sessions per month",
        "3 Free-tier guided coaching paths",
        "All 6 deep-dive assessment modules",
        "Personalized dashboard with classification, scores, focus areas",
        "Recovery mode and grief mode — always active when flagged",
        "Crisis resources accessible in one tap at all times",
        "Basic milestone tracking",
        "Daily check-in",
      ),
      ...excluded(
        "Unlimited sessions",
        "Pro or Premium paths",
        "Session memory system",
        "Reassessment",
        "Group or 1:1 coaching",
        "AI journal reflection",
        "PDF report",
      ),
    ],
  },
  {
    tier: TIER.PRO,
    name: "Pro",
    tagline: "Unlimited coaching, 40+ guided paths, group sessions, and reassessment.",
    badge: "Most popular",
    features: [
      ...included(
        "Everything in Free",
        "Unlimited AI coaching sessions — no monthly cap",
        "All 40+ Free and Pro guided coaching paths",
        "Full relational memory system — AI remembers across sessions",
        "Session continuity — AI references prior sessions naturally",
        "90-day reassessment — automatic trigger at day 90",
        "Score comparison, classification update, trajectory statement",
        "Basic PuP 360 PDF summary at reassessment — 1-2 pages",
        "AI journal reflection — Kota leaves a quiet note when you return",
        "Daily Kota messages — three personalized insights each day",
        "Daily check-in with streak tracking and dashboard widget",
        "Path and recovery milestone recognition with AI acknowledgment",
        "One group coaching session per month",
        "Pre-coaching brief for your human coach when you book",
      ),
      ...excluded(
        "On-demand reassessment (90-day cycle only)",
        "Sub-dimension score breakdown",
        "Full Premium PDF report",
        "1:1 sessions with the PuP coaching team",
        "Behavioral fingerprint reveal",
        "Premium-only paths (all 55)",
      ),
    ],
  },
  {
    tier: TIER.PREMIUM,
    name: "Premium",
    tagline: "Everything in Pro plus monthly credits for 1:1 coaching sessions.",
    badge: "1:1 coaching",
    features: included(
      "Everything in Pro",
      "One credit every month — two credits book one 30-minute 1:1 session",
      "All 55 guided coaching paths including Premium-only content",
      "On-demand reassessment — any time after day 30",
      "Sub-dimension score breakdown for each of the three dimensions",
      "Full PuP 360 PDF diagnostic report — 4-6 pages at every reassessment",
      "Behavioral fingerprint revealed in PDF — the only place it appears",
      "Score trend history across all assessments taken",
      "Complete path completion history and coaching summary in PDF",
      "Access to the PuP coaching team for 1:1 sessions",
      "Coach matched by classification, sub-mode, and flag status",
      "Priority access to new paths and features before general release",
    ),
  },
];

/** Founding Member is a pricing status on Pro, not a separate access level. */
export const FOUNDING_MEMBER_LABEL = "Founding Member";
export const FOUNDING_MEMBER_SECONDARY_LABEL = "Includes Pro access";

export function planCatalogEntry(tier: TierSlug): PlanCatalogEntry {
  const entry = PLAN_CATALOG.find((candidate) => candidate.tier === tier);
  if (!entry) throw new Error(`Unknown plan tier: ${tier}`);
  return entry;
}

/** Static monthly prices for marketing pages; Settings uses DB prices via overview RPC. */
export const LANDING_MONTHLY_PRICES = {
  free: 0,
  pro: 29,
  premium: 79,
  foundingPro: 19,
} as const;

/** Short feature bullets for the landing pricing section (aligned with card descriptions). */
export const LANDING_PLAN_BULLETS: Record<TierSlug, readonly string[]> = {
  [TIER.FREE]: [
    "7 AI coaching sessions per month",
    "3 Free-tier guided coaching paths",
    "Daily check-in & journal",
    "Crisis resources always available",
  ],
  [TIER.PRO]: [
    "Unlimited AI coaching sessions",
    "40+ Free and Pro guided coaching paths",
    "90-day reassessment with PDF summary",
    "One group coaching session per month",
    "AI journal reflection",
  ],
  [TIER.PREMIUM]: [
    "Everything in Pro",
    "Monthly credits for 30-minute 1:1 sessions",
    "All 55 paths including Premium-only content",
    "On-demand reassessment after day 30",
    "Full PuP 360 PDF diagnostic report",
  ],
};
