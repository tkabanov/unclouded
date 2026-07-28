import { Coins } from "lucide-react";

import {
  CREDITS_PER_SESSION_HELPER,
  CREDITS_UNAVAILABLE_MESSAGE,
  creditsExpireMessage,
  nextCreditMessage,
} from "@/lib/subscription/subscriptionCopy";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export interface PremiumCreditsCardProps {
  balance: number;
  nextCreditAt: string | null;
  creditsExpireAt: string | null;
  /** False once Premium has ended: the balance is shown but is not redeemable. */
  redeemable: boolean;
}

/**
 * Premium credit balance, accrual date, and expiry warning.
 *
 * A scheduled cancellation or downgrade surfaces the expiry date here so the
 * consequence is visible before the date arrives.
 */
export default function PremiumCreditsCard({
  balance,
  nextCreditAt,
  creditsExpireAt,
  redeemable,
}: PremiumCreditsCardProps) {
  const nextCreditLabel = formatSubscriptionDate(nextCreditAt);
  const expiryLabel = formatSubscriptionDate(creditsExpireAt);

  return (
    <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-5")}>
      <header className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Coins className="h-4 w-4 text-primary" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-foreground">
            Available credits: <span data-testid="credit-balance">{balance}</span>
          </p>
          <p className="text-sm text-muted-foreground">{CREDITS_PER_SESSION_HELPER}</p>
        </div>
      </header>

      {!redeemable ? (
        <p className="text-sm text-destructive">{CREDITS_UNAVAILABLE_MESSAGE}</p>
      ) : (
        <>
          {expiryLabel ? (
            <p className="text-sm text-destructive">{creditsExpireMessage(expiryLabel)}</p>
          ) : nextCreditLabel ? (
            <p className="text-sm text-muted-foreground">{nextCreditMessage(nextCreditLabel)}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
