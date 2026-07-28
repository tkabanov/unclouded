import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PAYMENT_ISSUE_MESSAGE } from "@/lib/subscription/subscriptionCopy";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";

export interface PaymentIssueBannerProps {
  /** End of the provider retry window: 7 days monthly, 14 days yearly. */
  gracePeriodEndsAt: string | null;
  pending: boolean;
  onUpdatePaymentMethod: () => void;
}

export default function PaymentIssueBanner({
  gracePeriodEndsAt,
  pending,
  onUpdatePaymentMethod,
}: PaymentIssueBannerProps) {
  const graceLabel = formatSubscriptionDate(gracePeriodEndsAt);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-destructive/40 bg-destructive/5 p-5 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
        </span>
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">Payment issue</p>
          <p className="text-sm text-muted-foreground">{PAYMENT_ISSUE_MESSAGE}</p>
          {graceLabel ? (
            <p className="text-sm text-muted-foreground">
              Your access continues until {graceLabel} while we retry the payment.
            </p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="cta"
        className="shrink-0"
        disabled={pending}
        onClick={onUpdatePaymentMethod}
      >
        {pending ? "Opening…" : "Update Payment Method"}
      </Button>
    </div>
  );
}
