import { useCallback, useState } from "react";

import type { TierSlug } from "@/lib/enums/tier";
import {
  shouldShowUpsell,
  type LockedFeatureKey,
} from "@/lib/subscription/lockedFeatureUpsell";

export type UseLockedFeatureUpsell = {
  /** The feature whose dialog is open, or null. */
  openFeature: LockedFeatureKey | null;
  /** Opens the dialog only when the tier actually lacks the feature. */
  promptUpgrade: (feature: LockedFeatureKey) => void;
  closeUpsell: () => void;
  /** Enterprise accounts get contact-HR copy instead of Stripe CTAs. */
  isEnterprise: boolean;
};

/**
 * Shared state for contextual upgrade dialogs.
 *
 * Callers ask to prompt; the hook decides. A user who already has the required
 * tier gets nothing, so entry points don't have to repeat the tier check.
 */
export function useLockedFeatureUpsell(
  currentTier: TierSlug,
  accountType?: string | null,
): UseLockedFeatureUpsell {
  const [openFeature, setOpenFeature] = useState<LockedFeatureKey | null>(null);
  const isEnterprise = (accountType ?? "individual").trim().toLowerCase() === "enterprise";

  const promptUpgrade = useCallback(
    (feature: LockedFeatureKey) => {
      if (!shouldShowUpsell(feature, currentTier)) return;
      setOpenFeature(feature);
    },
    [currentTier],
  );

  const closeUpsell = useCallback(() => setOpenFeature(null), []);

  return { openFeature, promptUpgrade, closeUpsell, isEnterprise };
}
