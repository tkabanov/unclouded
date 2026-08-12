/** Dedicated subscription management route (OVR-051). */

export const SUBSCRIPTION_ROUTE = "/subscription" as const;

export function subscriptionPath(query?: Record<string, string | undefined | null>): string {
  if (!query) return SUBSCRIPTION_ROUTE;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${SUBSCRIPTION_ROUTE}?${qs}` : SUBSCRIPTION_ROUTE;
}
