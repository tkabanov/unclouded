/**
 * Date and money formatting for the subscription screen.
 *
 * Dates use the browser locale and time zone. Amounts are formatted from
 * provider-supplied minor units — the app never computes a charge itself.
 */
import type { BillingInterval, PlanPrice } from "@/lib/subscription/subscriptionState";

export function formatSubscriptionDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatMoneyFromCents(
  amountCents: number | null | undefined,
  currency = "usd",
): string | null {
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    // Whole-dollar plans read better without trailing zeros.
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  month: "Monthly",
  year: "Yearly",
};

export const BILLING_INTERVAL_SUFFIX: Record<BillingInterval, string> = {
  month: "/month",
  year: "/year",
};

/** Price a card should show for the selected interval, honouring founding rate. */
export function findPlanPrice(
  prices: PlanPrice[],
  tier: string,
  interval: BillingInterval,
  preferFoundingRate: boolean,
): PlanPrice | null {
  const candidates = prices.filter(
    (price) => price.tierSlug === tier && price.billingInterval === interval,
  );
  if (preferFoundingRate) {
    const founding = candidates.find((price) => price.isFoundingRate);
    if (founding) return founding;
  }
  return candidates.find((price) => !price.isFoundingRate) ?? null;
}

/** Yearly billing is offered only once a real yearly price exists. */
export function isIntervalAvailable(prices: PlanPrice[], interval: BillingInterval): boolean {
  return prices.some(
    (price) => price.billingInterval === interval && price.isActive && price.amountCents !== null,
  );
}

export function formatPlanPrice(price: PlanPrice | null): string {
  if (!price || price.amountCents === null) return "TBD";
  return formatMoneyFromCents(price.amountCents, price.currency) ?? "TBD";
}
