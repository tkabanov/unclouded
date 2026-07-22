import posthog from "posthog-js";

import { peekPendingReferralCode } from "@/lib/share/referralAttribution";
import { peekPendingSignupPlan } from "@/lib/share/planAttribution";
import { peekPendingUtmParams } from "@/lib/share/utmAttribution";

export const PRODUCT_FUNNEL_STEPS = [
  "signup_completed",
  "onboarding_started",
  "onboarding_completed",
  "plan_upgrade_clicked",
  "free_to_pro_conversion",
] as const;

export type ProductAnalyticsEvent = (typeof PRODUCT_FUNNEL_STEPS)[number] | string;

export type ProductAnalyticsProperties = Record<string, string | number | boolean | null>;

export type ProductAnalyticsTraits = {
  tier?: string | null;
  signupPlan?: string | null;
  classification?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referralCode?: string | null;
};

let initialized = false;

function readPostHogKey(): string | null {
  const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
  return key || null;
}

function readPostHogHost(): string {
  return import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
}

export function isProductAnalyticsEnabled(): boolean {
  return readPostHogKey() !== null;
}

export function initProductAnalytics(): void {
  const key = readPostHogKey();
  if (!key || initialized) return;

  posthog.init(key, {
    api_host: readPostHogHost(),
    capture_pageview: true,
    persistence: "localStorage",
  });
  initialized = true;
}

export function buildPendingAttributionProperties(): ProductAnalyticsProperties {
  const utm = peekPendingUtmParams();
  const referralCode = peekPendingReferralCode();
  const signupPlan = peekPendingSignupPlan();

  return {
    referral_code: referralCode,
    signup_plan: signupPlan,
    utm_source: utm?.utm_source ?? null,
    utm_medium: utm?.utm_medium ?? null,
    utm_campaign: utm?.utm_campaign ?? null,
  };
}

export function buildProductAnalyticsTraits(
  traits: ProductAnalyticsTraits,
): ProductAnalyticsProperties {
  return {
    tier: traits.tier ?? null,
    signup_plan: traits.signupPlan ?? null,
    classification: traits.classification ?? null,
    utm_source: traits.utmSource ?? null,
    utm_medium: traits.utmMedium ?? null,
    utm_campaign: traits.utmCampaign ?? null,
    referral_code: traits.referralCode ?? null,
  };
}

export function identifyUser(userId: string, traits?: ProductAnalyticsTraits): void {
  if (!initialized) return;
  posthog.identify(userId, traits ? buildProductAnalyticsTraits(traits) : undefined);
}

export function resetUser(): void {
  if (!initialized) return;
  posthog.reset();
}

export function trackProductEvent(
  name: ProductAnalyticsEvent,
  properties?: ProductAnalyticsProperties,
): void {
  if (!initialized) return;
  posthog.capture(name, properties);
}

/** Test-only reset for module state between cases. */
export function resetProductAnalyticsForTests(): void {
  initialized = false;
}
