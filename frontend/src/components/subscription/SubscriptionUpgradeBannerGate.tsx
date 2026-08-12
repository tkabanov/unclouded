import SubscriptionUpgradeBanner from "@/components/subscription/SubscriptionUpgradeBanner";
import { TIER } from "@/lib/enums/tier";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import { useUserProfile } from "@/lib/userProfile";

export interface SubscriptionUpgradeBannerGateProps {
  className?: string;
}

/** Shows the Free-tier upgrade banner for individual accounts without a paid plan. */
export default function SubscriptionUpgradeBannerGate({
  className,
}: SubscriptionUpgradeBannerGateProps) {
  const { profile, loading } = useUserProfile();

  if (loading || !profile) {
    return null;
  }

  const isEnterprise = profile.accountType?.trim().toLowerCase() === "enterprise";
  if (isEnterprise) {
    return null;
  }

  const tier = resolveCurrentTier(
    profile.subscribed ?? false,
    profile.tier,
    profile.accountType,
    profile.enterpriseTier,
  );

  if (tier !== TIER.FREE) {
    return null;
  }

  return <SubscriptionUpgradeBanner className={className} />;
}
