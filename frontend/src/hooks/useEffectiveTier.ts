import { TIER, type TierSlug } from "@/lib/enums/tier";
import { useSubscriptionOverview } from "@/hooks/useSubscriptionOverview";

export type UseEffectiveTier = {
  /** Authoritative tier from subscription overview / state machine. */
  tier: TierSlug;
  loading: boolean;
};

/**
 * Effective tier for feature gates — always from `get_my_subscription_overview`,
 * never from legacy `profiles.subscribed` alone.
 *
 * Defaults to Free while loading so paid features stay locked until tier is known.
 */
export function useEffectiveTier(): UseEffectiveTier {
  const { overview, loading } = useSubscriptionOverview();
  return {
    tier: overview?.effectiveTier ?? TIER.FREE,
    loading: loading && !overview,
  };
}
