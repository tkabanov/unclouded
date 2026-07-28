import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { SETTINGS_TAB } from "@/lib/settings/settingsTabStub";
import { settingsPath } from "@/lib/settings/navigation";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { planCatalogEntry } from "@/lib/subscription/planCatalog";
import {
  lockedFeature,
  upsellPlansFor,
  type LockedFeatureKey,
} from "@/lib/subscription/lockedFeatureUpsell";
import { loadSubscriptionOverview } from "@/lib/subscription/subscriptionApi";
import {
  BILLING_INTERVAL_SUFFIX,
  findPlanPrice,
  formatPlanPrice,
} from "@/lib/subscription/subscriptionFormat";
import type { PlanPrice } from "@/lib/subscription/subscriptionState";

export interface LockedFeatureUpgradeDialogProps {
  open: boolean;
  feature: LockedFeatureKey;
  currentTier: TierSlug;
  onClose: () => void;
}

/**
 * Contextual upsell shown where a feature is locked.
 *
 * It names the feature, lists what the unlocking plan adds, and shows live
 * prices before handing off to the subscription screen. It never appears for a
 * user who already has the required tier.
 */
export default function LockedFeatureUpgradeDialog({
  open,
  feature,
  currentTier,
  onClose,
}: LockedFeatureUpgradeDialogProps) {
  const navigate = useNavigate();
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const details = lockedFeature(feature);
  const plans = upsellPlansFor(feature, currentTier);

  useEffect(() => {
    if (!open) return;

    trackProductEvent("paywall_shown", { surface: feature });

    let cancelled = false;
    loadSubscriptionOverview()
      .then((overview) => {
        if (!cancelled) setPrices(overview.prices);
      })
      .catch(() => {
        // Prices are supporting detail; the dialog still explains the lock.
      });

    return () => {
      cancelled = true;
    };
  }, [feature, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" aria-hidden />
            {details.title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-left">{details.description}</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {details.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {plans.length > 0 ? (
          <dl className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            {plans.map((tier) => {
              const price = findPlanPrice(prices, tier, "month", false);
              return (
                <div key={tier} className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">{planCatalogEntry(tier).name}</dt>
                  <dd className="font-medium">
                    {formatPlanPrice(price)}
                    {price?.amountCents !== null && price !== null
                      ? BILLING_INTERVAL_SUFFIX.month
                      : ""}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Not now
          </Button>
          <Button
            type="button"
            variant="cta"
            onClick={() => {
              onClose();
              navigate(settingsPath(SETTINGS_TAB.SUBSCRIPTION));
            }}
          >
            {plans.length === 1 && plans[0] === TIER.PREMIUM
              ? "Upgrade to Premium"
              : plans.length === 1
                ? "Upgrade to Pro"
                : "See plans"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
