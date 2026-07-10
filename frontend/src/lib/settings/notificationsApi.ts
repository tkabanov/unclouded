import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_FREQUENCY_KEY = "notificationFrequency";

/** Bubble ai_RNbBHYYG choices — stored as display text in notificationFrequency. */
export const NOTIFICATION_FREQUENCY_OPTIONS = [
  "Daily — remind me every day",
  "Weekly — remind me once a week",
  "Never — I'll check in on my own",
] as const;

export type NotificationFrequency = (typeof NOTIFICATION_FREQUENCY_OPTIONS)[number];

export const NOTIFICATION_FREQUENCY_PLACEHOLDER = "Select frequency" as const;

export const NOTIFICATION_FREQUENCY_DEFAULT: NotificationFrequency =
  "Weekly — remind me once a week";

export async function loadNotificationFrequency(userId: string): Promise<NotificationFrequency> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};
  const raw = onboarding[NOTIFICATION_FREQUENCY_KEY];
  if (typeof raw === "string" && NOTIFICATION_FREQUENCY_OPTIONS.includes(raw as NotificationFrequency)) {
    return raw as NotificationFrequency;
  }
  return NOTIFICATION_FREQUENCY_DEFAULT;
}

export async function saveNotificationFrequency(
  userId: string,
  frequency: NotificationFrequency,
): Promise<void> {
  const { data, error: readError } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...onboarding,
        [NOTIFICATION_FREQUENCY_KEY]: frequency,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}
