/**
 * One Stripe customer must not carry multiple billable subscriptions.
 * Duplicate checkouts (before webhook sync) can create extras; cancel orphans.
 */
import type Stripe from "npm:stripe@17.7.0";

const BILLABLE_STATUSES = ["active", "trialing", "past_due"] as const;

export async function listBillableStripeSubscriptions(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription[]> {
  const byId = new Map<string, Stripe.Subscription>();

  for (const status of BILLABLE_STATUSES) {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status,
      limit: 100,
    });
    for (const sub of page.data) {
      byId.set(sub.id, sub);
    }
  }

  return [...byId.values()].sort((a, b) => b.created - a.created);
}

export type ReconcileResult = {
  keptSubscriptionId: string | null;
  cancelledSubscriptionIds: string[];
};

/**
 * Keep a single canonical subscription on the customer. Prefer `preferredId` when
 * it is still billable; otherwise keep the newest subscription.
 */
export async function reconcileDuplicateStripeSubscriptions(
  stripe: Stripe,
  customerId: string,
  preferredSubscriptionId: string | null,
): Promise<ReconcileResult> {
  const billable = await listBillableStripeSubscriptions(stripe, customerId);
  if (billable.length === 0) {
    return { keptSubscriptionId: preferredSubscriptionId, cancelledSubscriptionIds: [] };
  }

  const preferredActive = preferredSubscriptionId
    ? billable.find((sub) => sub.id === preferredSubscriptionId)
    : undefined;
  const kept = preferredActive ?? billable[0];
  const cancelledSubscriptionIds: string[] = [];

  for (const sub of billable) {
    if (sub.id === kept.id) continue;
    try {
      await stripe.subscriptions.cancel(sub.id);
      cancelledSubscriptionIds.push(sub.id);
      console.log(
        `stripe-reconcile: cancelled duplicate subscription ${sub.id} for customer ${customerId}`,
      );
    } catch (err) {
      console.error(`stripe-reconcile: failed to cancel duplicate ${sub.id}`, err);
    }
  }

  return { keptSubscriptionId: kept.id, cancelledSubscriptionIds };
}
