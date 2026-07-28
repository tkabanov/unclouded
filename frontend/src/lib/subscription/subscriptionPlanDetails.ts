import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";
import {
  resolveAccessEndsAt,
  resolveNextRenewalAt,
  type SubscriptionRecord,
} from "@/lib/subscription/subscriptionState";

/** Dates shown under the price of the user's current plan card. */
export function buildCurrentPlanDetails(
  record: SubscriptionRecord,
): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = [];

  if (record.isFoundingMember) {
    const started = formatSubscriptionDate(
      record.foundingStartedAt ?? record.currentPeriodStart,
    );
    if (started) details.push({ label: "Started", value: started });

    const discountEnds = formatSubscriptionDate(record.foundingDiscountEndsAt);
    if (discountEnds) details.push({ label: "Discount ends", value: discountEnds });
  }

  if (record.status === "scheduledToDowngrade") {
    const accessEnds = formatSubscriptionDate(resolveAccessEndsAt(record));
    if (accessEnds) {
      details.push({ label: "Premium active until", value: accessEnds });
      details.push({ label: "Downgrade to Pro scheduled for", value: accessEnds });
    }
    return details;
  }

  const renewal = formatSubscriptionDate(resolveNextRenewalAt(record));
  if (renewal) details.push({ label: "Next renewal date", value: renewal });

  const accessEnds = formatSubscriptionDate(resolveAccessEndsAt(record));
  if (accessEnds && record.status !== "scheduledToCancel") {
    details.push({
      label: record.status === "pastDue" ? "Access continues until" : "Access expires",
      value: accessEnds,
    });
  }

  return details;
}
