import { supabase } from "@/integrations/supabase/client";
import {
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";

export interface AdminAnalyticsSnapshot {
  totalUsers: number;
  checkins: number;
  topCoachingMode: string;
  enrolledUsers: number;
}

type ProfileRow = {
  subscribed?: boolean | null;
  onboarding_data?: Record<string, unknown> | null;
};

function readCoachingMode(onboarding: Record<string, unknown> | null | undefined): string | null {
  const raw = onboarding?.ai_coaching_mode_os ?? onboarding?.ai_coaching_mode_list_list_option_ai_coaching_mode_os;
  return typeof raw === "string" ? raw : null;
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsSnapshot> {
  const [profilesResult, journalResult] = await Promise.all([
    supabase.from("profiles").select("subscribed, onboarding_data"),
    supabase.from("journal_entries").select("id", { count: "exact", head: true }),
  ]);

  if (profilesResult.error) throw profilesResult.error;

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const totalUsers = profiles.length;
  const enrolledUsers = profiles.filter((profile) => profile.subscribed).length;

  const modeCounts = new Map<string, number>();
  for (const profile of profiles) {
    const mode = readCoachingMode(profile.onboarding_data ?? null);
    if (!mode) continue;
    modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1);
  }

  let topModeSlug: AiCoachingModeSlug | null = null;
  let topCount = 0;
  for (const [mode, count] of modeCounts) {
    if (count > topCount) {
      topCount = count;
      topModeSlug = mode as AiCoachingModeSlug;
    }
  }

  const topCoachingMode =
    topModeSlug && topModeSlug in AI_COACHING_MODE_LABELS
      ? AI_COACHING_MODE_LABELS[topModeSlug]
      : "N/A";

  return {
    totalUsers,
    checkins: journalResult.count ?? 0,
    topCoachingMode,
    enrolledUsers,
  };
}
