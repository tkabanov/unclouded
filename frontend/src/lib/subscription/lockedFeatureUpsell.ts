/**
 * Registry of locked features and the plans that unlock them.
 *
 * Every locked entry point shows the same contextual dialog instead of silently
 * navigating to the subscription screen, so the user learns what the feature is
 * and which plan unlocks it before being asked to pay. A user who already has
 * the required tier never sees an upsell.
 */
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { CREDITS_PER_ONE_ON_ONE_SESSION } from "@/lib/subscription/subscriptionState";

export type LockedFeatureKey =
  | "chatSessionLimit"
  | "proPath"
  | "premiumPath"
  | "reassessment"
  | "onDemandReassessment"
  | "journalAiReflection"
  | "pupPdfReport"
  | "groupSession"
  | "oneOnOneSession";

export type LockedFeature = {
  key: LockedFeatureKey;
  /** Lowest tier that unlocks the feature. */
  requiredTier: Exclude<TierSlug, typeof TIER.FREE>;
  title: string;
  description: string;
  benefits: string[];
};

const TIER_RANK: Record<TierSlug, number> = {
  [TIER.FREE]: 0,
  [TIER.PRO]: 1,
  [TIER.PREMIUM]: 2,
};

export const LOCKED_FEATURES: Record<LockedFeatureKey, LockedFeature> = {
  chatSessionLimit: {
    key: "chatSessionLimit",
    requiredTier: TIER.PRO,
    title: "You've used all 7 sessions this month",
    description:
      "Free includes 7 AI coaching sessions each month. Upgrade to keep going without a cap, and " +
      "your coach will remember what you've worked through.",
    benefits: [
      "Unlimited AI coaching sessions",
      "Full relational memory across sessions",
      "All 40+ Free and Pro guided coaching paths",
    ],
  },
  proPath: {
    key: "proPath",
    requiredTier: TIER.PRO,
    title: "This path is part of Pro",
    description:
      "Pro unlocks the full guided path library along with unlimited coaching sessions and your " +
      "90-day reassessment.",
    benefits: [
      "All 40+ Free and Pro guided coaching paths",
      "Unlimited AI coaching sessions",
      "90-day reassessment with score comparison",
    ],
  },
  premiumPath: {
    key: "premiumPath",
    requiredTier: TIER.PREMIUM,
    title: "This path is part of Pro or Premium",
    description:
      "Upgrade to Pro or Premium to unlock this path and access the full premium path library.",
    benefits: [
      "All 55 guided coaching paths, including Premium-only content",
      "On-demand reassessment any time after day 30",
      "One credit every month toward 1:1 coaching",
    ],
  },
  reassessment: {
    key: "reassessment",
    requiredTier: TIER.PRO,
    title: "Reassessment is part of Pro or Premium",
    description:
      "Upgrade to Pro or Premium to complete your reassessment and review your progress.",
    benefits: [
      "90-day reassessment with score comparison",
      "Classification update and trajectory statement",
      "PuP 360 PDF summary at every reassessment",
    ],
  },
  onDemandReassessment: {
    key: "onDemandReassessment",
    requiredTier: TIER.PREMIUM,
    title: "On-demand reassessment is Premium",
    description:
      "Premium members can reassess any time after day 30 instead of waiting for the 90-day cycle.",
    benefits: [
      "Reassess on demand after day 30",
      "Sub-dimension score breakdown",
      "Full 4-6 page PuP 360 PDF report",
    ],
  },
  journalAiReflection: {
    key: "journalAiReflection",
    requiredTier: TIER.PRO,
    title: "AI journal reflection is part of Pro",
    description:
      "Share a journal entry and get a coaching response that connects it to your PuP 360 profile.",
    benefits: [
      "AI reflection on any journal entry",
      "Unlimited AI coaching sessions",
      "90-day reassessment with score comparison",
    ],
  },
  pupPdfReport: {
    key: "pupPdfReport",
    requiredTier: TIER.PRO,
    title: "The PuP 360 report is part of Pro",
    description:
      "Pro includes a PDF summary at every reassessment. Premium adds the full diagnostic report " +
      "with your behavioral fingerprint.",
    benefits: [
      "PuP 360 PDF summary at every reassessment",
      "Score trend history across assessments",
      "Full 4-6 page report with behavioral fingerprint on Premium",
    ],
  },
  groupSession: {
    key: "groupSession",
    requiredTier: TIER.PRO,
    title: "Group coaching sessions come with Pro or Premium",
    description:
      "Upgrade to Pro or Premium to access one group session per month.",
    benefits: [
      "One group coaching session per month",
      "Unlimited AI coaching sessions",
      "All 40+ Free and Pro guided coaching paths",
    ],
  },
  oneOnOneSession: {
    key: "oneOnOneSession",
    requiredTier: TIER.PREMIUM,
    title: "Unlock 1:1 Sessions",
    description:
      "Upgrade to Premium to earn monthly credits and book 30-minute 1:1 sessions. " +
      `${CREDITS_PER_ONE_ON_ONE_SESSION} credits are required for one session.`,
    benefits: [
      `One credit every month — ${CREDITS_PER_ONE_ON_ONE_SESSION} credits book one 30-minute session`,
      "Coach matched by classification, sub-mode, and flag status",
      "All 55 guided coaching paths and on-demand reassessment",
    ],
  },
};

export function lockedFeature(key: LockedFeatureKey): LockedFeature {
  return LOCKED_FEATURES[key];
}

/** False for anyone who already has the tier — Premium users see no upsells. */
export function shouldShowUpsell(key: LockedFeatureKey, currentTier: TierSlug): boolean {
  return TIER_RANK[currentTier] < TIER_RANK[LOCKED_FEATURES[key].requiredTier];
}

/**
 * Plans to display in the dialog: only the ones that actually unlock the
 * feature and are an upgrade from where the user is today.
 */
export function upsellPlansFor(key: LockedFeatureKey, currentTier: TierSlug): TierSlug[] {
  // Client spec: Free users clicking a Premium-tier path see Pro and Premium offers.
  if (key === "premiumPath" && currentTier === TIER.FREE) {
    return [TIER.PRO, TIER.PREMIUM];
  }

  const required = TIER_RANK[LOCKED_FEATURES[key].requiredTier];
  return [TIER.PRO, TIER.PREMIUM].filter(
    (tier) => TIER_RANK[tier] >= required && TIER_RANK[tier] > TIER_RANK[currentTier],
  );
}
