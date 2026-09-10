/**
 * MOB-11 — daily check-in reminder push.
 *
 * Invoke via Supabase cron (hourly — see `20260910120000_engagement_push_jobs.sql`):
 *   POST /functions/v1/daily-checkin-reminder
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <DAILY_CHECKIN_REMINDER_CRON_SECRET>
 *
 * Eligibility (`isDailyCheckinReminderDue`): onboarding complete, no check-in
 * yet today (user's local calendar date), not already reminded today, and
 * local time has reached the evening window. Running hourly lets each
 * timezone's evening window be caught without a per-user scheduler; the
 * same-day dedupe stamp makes the other 23 hourly ticks a no-op.
 *
 * Channel: push only (web + native via `pushFanout`) — no email fallback for
 * this notification type.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { canonicalAppOrigin } from "../_shared/appOrigin.ts";
import {
  getDateKey,
  isDailyCheckinReminderDue,
  type DailyCheckinReminderProfileRow,
} from "../_shared/engagementNotificationsLogic.ts";
import { isWebPushConfigured, sendWebPushToSubscription } from "../_shared/webPushDelivery.ts";
import {
  isNativePushConfigured,
  sendNativePushToSubscription,
} from "../_shared/nativePushDelivery.ts";
import { fanOutPushToSubscriptions, type AnyPushSubscriptionRow } from "../_shared/pushFanout.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorize(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer && bearer === serviceKey) return true;

  const cronSecret = Deno.env.get("DAILY_CHECKIN_REMINDER_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }
  if (!authorize(req, serviceKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const appUrl = canonicalAppOrigin();
  const now = new Date();
  const nowIso = now.toISOString();
  const anyPushConfigured = isWebPushConfigured() || isNativePushConfigured();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, firstName, timeZone, onboardingCompleted, checkinReminderSentAt")
    .eq("onboardingCompleted", true);

  if (profilesError) {
    return json({ error: profilesError.message }, 500);
  }

  let candidateCount = 0;
  let sentCount = 0;
  let expiredSubscriptionsRemoved = 0;
  const stamped: string[] = [];
  const sendResults: Array<{ userId: string; detail: string }> = [];

  for (const row of (profiles ?? []) as DailyCheckinReminderProfileRow[]) {
    const { data: lastCheckin, error: checkinError } = await supabase
      .from("dailyCheckin")
      .select("date")
      .eq("userId", row.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkinError) {
      sendResults.push({ userId: row.id, detail: `checkin_lookup_error: ${checkinError.message}` });
      continue;
    }

    const checkedInToday =
      typeof lastCheckin?.date === "string" &&
      getDateKey(new Date(lastCheckin.date), row.timeZone) === getDateKey(now, row.timeZone);

    if (!isDailyCheckinReminderDue(row, checkedInToday, now)) {
      continue;
    }

    candidateCount += 1;

    let detail = "push:skipped — no push configured";
    if (anyPushConfigured) {
      const { data: subs } = await supabase
        .from("pushDeviceSubscription")
        .select("id, platform, endpoint, p256dh, auth, deviceToken")
        .eq("userId", row.id);

      const fanout = await fanOutPushToSubscriptions(
        (subs ?? []) as AnyPushSubscriptionRow[],
        {
          title: "How are you doing today?",
          body: "Take a minute for your daily check-in with Kota.",
          url: `${appUrl}/dashboard`,
        },
        { sendWebPush: sendWebPushToSubscription, sendNativePush: sendNativePushToSubscription },
      );

      if (fanout.invalidSubscriptionIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("pushDeviceSubscription")
          .delete()
          .in("id", fanout.invalidSubscriptionIds);
        if (!deleteError) expiredSubscriptionsRemoved += fanout.invalidSubscriptionIds.length;
      }

      detail = fanout.ok
        ? "push:sent"
        : `push:failed — ${fanout.results.map((r) => r.detail).join("; ") || "no subscriptions"}`;
      if (fanout.ok) sentCount += 1;
    }

    sendResults.push({ userId: row.id, detail });

    // Stamp the attempt regardless of delivery outcome — this is a
    // once-per-day attempt cap, not a delivery guarantee (same convention as
    // `firstModuleMilestoneEmailedAt`).
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ checkinReminderSentAt: nowIso, lastNotificationSentAt: nowIso })
      .eq("id", row.id);

    if (!updateError) stamped.push(row.id);
  }

  return json({
    ok: true,
    candidateCount,
    sentCount,
    expiredSubscriptionsRemoved,
    stampedCount: stamped.length,
    userIds: stamped,
    sendResults,
    push: anyPushConfigured
      ? [isWebPushConfigured() && "web-push", isNativePushConfigured() && "native-push"]
          .filter((label): label is string => Boolean(label))
          .join("+")
      : "skipped",
  });
});
