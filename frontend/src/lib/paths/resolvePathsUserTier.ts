import { TIER, type TierSlug } from "@/lib/enums/tier";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";

type ProfileTierInput = {
  subscribed?: boolean | null;
  tier?: string | null;
  accountType?: string | null;
  enterpriseTier?: string | null;
};

/** Effective tier for path catalog gates — uses profile cache, not onboarding JSON. */
export function resolvePathsUserTier(profile: ProfileTierInput | null | undefined): TierSlug {
  if (!profile) return TIER.FREE;
  return resolveCurrentTier(
    profile.subscribed ?? false,
    profile.tier ?? null,
    profile.accountType ?? null,
    profile.enterpriseTier ?? null,
  );
}
