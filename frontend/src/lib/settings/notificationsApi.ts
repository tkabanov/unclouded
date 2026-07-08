import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_FREQUENCY_KEY = "notification_frequency_text";

export const NOTIFICATION_FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly summary" },
  { value: "important_only", label: "Important only" },
  { value: "off", label: "Off" },
] as const;

export type NotificationFrequency =
  (typeof NOTIFICATION_FREQUENCY_OPTIONS)[number]["value"];

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
  const match = NOTIFICATION_FREQUENCY_OPTIONS.find((option) => option.value === raw);
  return match?.value ?? "weekly";
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
