/**
 * Which subscription actions are valid for a given state.
 *
 * Mirrors `frontend/src/lib/subscription/subscriptionActions.ts`. The UI uses it
 * to enable only valid buttons; the edge function uses it to reject anything the
 * UI should not have offered in the first place, so a stale tab cannot cancel a
 * subscription twice or schedule a downgrade on top of a cancellation.
 */
import {
  normalizeStatus,
  normalizeTier,
  resolveEffectiveTier,
  type SubscriptionStateRow,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "./subscriptionLifecycle.ts";

export type SubscriptionAction =
  | "cancel"
  | "resume"
  | "scheduleDowngrade"
  | "cancelDowngrade"
  | "upgradeToPremium"
  | "startCheckout"
  | "updatePaymentMethod";

export type SubscriptionActionState = SubscriptionStateRow & {
  hasStripeSubscription?: boolean | null;
  hasStripeCustomer?: boolean | null;
  accountType?: string | null;
};

export function resolveAllowedActions(
  state: SubscriptionActionState,
  nowMs = Date.now(),
): SubscriptionAction[] {
  // Enterprise entitlement is contract-based: no self-serve billing actions.
  if ((state.accountType ?? "").toLowerCase() === "enterprise") return [];

  const status = normalizeStatus(state.status);
  const effectiveTier = resolveEffectiveTier(state, nowMs);
  const planTier = normalizeTier(state.planTier) ?? "free";
  const actions: SubscriptionAction[] = [];

  if (effectiveTier === "free") {
    actions.push("startCheckout");
    if (state.hasStripeCustomer) actions.push("updatePaymentMethod");
    return actions;
  }

  if (state.hasStripeCustomer) actions.push("updatePaymentMethod");

  switch (status) {
    case "active":
      actions.push("cancel");
      if (planTier === "premium") actions.push("scheduleDowngrade");
      else if (state.hasStripeSubscription) actions.push("upgradeToPremium");
      else actions.push("startCheckout");
      break;
    case "pastDue":
      // Recovery first: no plan changes while the charge is unresolved.
      actions.push("cancel");
      break;
    case "scheduledToCancel":
      actions.push("resume");
      if (
        planTier !== "premium" &&
        effectiveTier === "pro" &&
        state.hasStripeSubscription
      ) {
        actions.push("upgradeToPremium");
      }
      break;
    case "scheduledToDowngrade":
      actions.push("cancelDowngrade");
      break;
    case "free":
    case "inactive":
      actions.push("startCheckout");
      break;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }

  return actions;
}

export function isActionAllowed(
  action: SubscriptionAction,
  state: SubscriptionActionState,
  nowMs = Date.now(),
): boolean {
  return resolveAllowedActions(state, nowMs).includes(action);
}

/** Human-readable reason used in error responses when an action is rejected. */
export function describeRejection(
  action: SubscriptionAction,
  status: SubscriptionStatus,
  effectiveTier: SubscriptionTier,
): string {
  switch (action) {
    case "cancel":
      return status === "scheduledToCancel"
        ? "Your subscription is already scheduled to cancel."
        : "There's no active subscription to cancel.";
    case "resume":
      return "Your subscription isn't scheduled to cancel, so there's nothing to resume.";
    case "scheduleDowngrade":
      return effectiveTier === "premium"
        ? "A downgrade can't be scheduled while another change is pending."
        : "Only Premium subscriptions can be downgraded to Pro.";
    case "cancelDowngrade":
      return "You don't have a scheduled downgrade.";
    case "upgradeToPremium":
      return effectiveTier === "premium"
        ? "You're already on Premium."
        : "An active Pro subscription is required to upgrade to Premium.";
    case "startCheckout":
      return "You already have an active subscription.";
    case "updatePaymentMethod":
      return "You don't have a billing account yet.";
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
