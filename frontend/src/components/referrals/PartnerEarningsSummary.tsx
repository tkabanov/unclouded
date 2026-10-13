import { Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PartnerPortal } from "@/lib/referrals/partnerPortalApi";
import {
  PARTNER_TERMS_ENDED,
  PARTNER_TERMS_NOT_CONFIGURED,
  describePartnerTerms,
  formatMoney,
} from "@/lib/referrals/referralCopy";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PartnerEarningsSummary({ portal }: { portal: PartnerPortal }) {
  const { totals, terms, termsStatus } = portal;
  const confirmed = termsStatus === "confirmed" && terms !== null;
  // Terms archived after commissions accrued: earlier earnings are real, new ones are not priced.
  const hasPastEarnings = totals.earned.some((amount) => amount.cents !== 0);
  const earned = totals.earned.length
    ? totals.earned.map((amount) => formatMoney(amount.cents, amount.currency)).join(" + ")
    : formatMoney(0, "usd");

  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Wallet className="h-5 w-5 text-primary" aria-hidden />
          Earnings
        </CardTitle>
        <CardDescription className="text-sm">
          {confirmed
            ? `Your terms: ${describePartnerTerms(terms)}${
                terms.effectiveFrom ? `, from ${formatSubscriptionDate(terms.effectiveFrom)}` : ""
              }.`
            : "Commission terms are not confirmed yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Sign-ups" value={totals.signups} />
          <Stat label="Paying clients" value={totals.payingClients} />
          <Stat label="Earned" value={confirmed || hasPastEarnings ? earned : "—"} />
        </div>
        {!confirmed ? (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            {hasPastEarnings ? PARTNER_TERMS_ENDED : PARTNER_TERMS_NOT_CONFIGURED}
          </p>
        ) : null}
        {totals.pendingTermsPayments > 0 ? (
          <p className="text-xs text-muted-foreground">
            {totals.pendingTermsPayments} payment{totals.pendingTermsPayments === 1 ? " is" : "s are"} not
            covered by confirmed terms and {totals.pendingTermsPayments === 1 ? "isn't" : "aren't"} counted
            as earnings.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Earnings are net of refunds and chargebacks.
        </p>
      </CardContent>
    </Card>
  );
}
