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
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { planCatalogEntry } from "@/lib/subscription/planCatalog";
import { subscriptionPath } from "@/lib/subscription/routes";
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
  /** When true, show non-purchase messaging only (no Stripe / See plans). */
  isEnterprise?: boolean;
}

/**
 * Contextual upsell shown where a feature is locked.
 *
 * It names the feature, lists what the unlocking plan adds, and shows live
 * prices before handing off to the subscription screen. It never appears for a
 * user who already has the required tier. Enterprise users get contact-HR copy.
 */
export default function LockedFeatureUpgradeDialog({
  open,
  feature,
  currentTier,
  onClose,
  isEnterprise = false,
}: LockedFeatureUpgradeDialogProps) {
  const navigate = useNavigate();
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const details = lockedFeature(feature);
  const plans = upsellPlansFor(feature, currentTier);

  useEffect(() => {
    if (!open) return;

    trackProductEvent("paywall_shown", {
      surface: feature,
      enterprise: isEnterprise,
    });

    if (isEnterprise) return;

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
  }, [feature, open, isEnterprise]);

  if (isEnterprise) {
    return (
      <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" aria-hidden />
              {details.title}
            </DialogTitle>
            <DialogDescription className="pt-2 text-left">
              This feature is not included in your organization&apos;s plan. Contact your HR
              administrator if you need access — individual checkout is not available on enterprise
              accounts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="cta" onClick={onClose}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
              navigate(subscriptionPath());
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
