/**
 * When a paid individual converts to enterprise, stop Stripe collection
 * immediately and mark the local userSubscription inactive.
 *
 * Safe for enterprise profiles: sync_profile_entitlement_from_subscription
 * skips accountType = enterprise.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import { getStripe, loadSubscriptionRow } from "./stripeBilling.ts";

const BILLABLE_STATUSES = new Set([
  "active",
  "pastDue",
  "scheduledToCancel",
  "scheduledToDowngrade",
]);

export type CancelIndividualStripeResult = {
  attempted: boolean;
  canceledStripe: boolean;
  markedInactive: boolean;
  error?: string;
};

export async function cancelIndividualStripeOnEnterpriseConvert(
  service: SupabaseClient,
  userId: string,
): Promise<CancelIndividualStripeResult> {
  const row = await loadSubscriptionRow(service, userId);
  if (!row) {
    return { attempted: false, canceledStripe: false, markedInactive: false };
  }

  const hasBillableStatus = BILLABLE_STATUSES.has(row.status);
  const hasStripeSub = Boolean(row.stripeSubscriptionId?.trim());
  if (!hasBillableStatus && !hasStripeSub) {
    return { attempted: false, canceledStripe: false, markedInactive: false };
  }

  let canceledStripe = false;
  let stripeError: string | undefined;

  if (hasStripeSub && row.stripeSubscriptionId) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(row.stripeSubscriptionId);
      canceledStripe = true;
    } catch (err) {
      stripeError = err instanceof Error ? err.message : String(err);
      console.error(
        `enterprise-convert: Stripe cancel failed for ${userId} (${row.stripeSubscriptionId})`,
        err,
      );
    }
  }

  const { error: expireError } = await service.rpc("billing_expire_subscription", {
    p_user_id: userId,
  });
  if (expireError) {
    console.error(
      `enterprise-convert: billing_expire_subscription failed for ${userId}`,
      expireError,
    );
    return {
      attempted: true,
      canceledStripe,
      markedInactive: false,
      error: stripeError ?? expireError.message,
    };
  }

  return {
    attempted: true,
    canceledStripe,
    markedInactive: true,
    error: stripeError,
  };
}
