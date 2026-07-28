import SubscriptionConfirmDialog from "@/components/subscription/SubscriptionConfirmDialog";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { checkoutDialogCopy } from "@/lib/subscription/subscriptionCopy";
import {
  BILLING_INTERVAL_LABELS,
  formatPlanPrice,
} from "@/lib/subscription/subscriptionFormat";
import { planCatalogEntry } from "@/lib/subscription/planCatalog";
import type { BillingInterval, PlanPrice } from "@/lib/subscription/subscriptionState";

export interface CheckoutConfirmDialogProps {
  open: boolean;
  tier: TierSlug | null;
  interval: BillingInterval;
  price: PlanPrice | null;
  pendingLabel?: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Free → Pro / Free → Premium confirmation.
 *
 * The final amount, tax, and renewal date are shown by Stripe Checkout — this
 * step only confirms the plan choice before handing off.
 */
export default function CheckoutConfirmDialog({
  open,
  tier,
  interval,
  price,
  pendingLabel = null,
  onConfirm,
  onDismiss,
}: CheckoutConfirmDialogProps) {
  if (!tier) return null;

  const catalog = planCatalogEntry(tier);
  const includedFeatures = catalog.features
    .filter((feature) => feature.included)
    .slice(0, tier === TIER.PREMIUM ? 4 : 3);

  return (
    <SubscriptionConfirmDialog
      open={open}
      copy={checkoutDialogCopy(tier)}
      pendingLabel={pendingLabel}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
    >
      <dl className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Selected plan</dt>
          <dd className="font-medium">{catalog.name}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Billing frequency</dt>
          <dd className="font-medium">{BILLING_INTERVAL_LABELS[interval]}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Price</dt>
          <dd className="font-medium">{formatPlanPrice(price)}</dd>
        </div>
      </dl>

      <ul className="space-y-1 text-sm text-muted-foreground">
        {includedFeatures.map((feature) => (
          <li key={feature.label}>{feature.label}</li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Your exact total, tax, and renewal date are confirmed on the payment page. Your
        subscription renews automatically until you cancel.
      </p>
    </SubscriptionConfirmDialog>
  );
}
