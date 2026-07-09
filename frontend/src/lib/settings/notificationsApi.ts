import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_FREQUENCY_KEY = "notification_frequency_text";

/** Bubble ai_RNbBHYYG choices — stored as display text in notification_frequency_text. */
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
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};
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
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_data: {
        ...onboarding,
        [NOTIFICATION_FREQUENCY_KEY]: frequency,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}
