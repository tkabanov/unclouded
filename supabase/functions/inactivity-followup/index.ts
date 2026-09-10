/**
 * MOB-11 — 5-day inactivity follow-up push.
 *
 * Invoke via Supabase cron (daily — see `20260910120000_engagement_push_jobs.sql`):
 *   POST /functions/v1/inactivity-followup
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <INACTIVITY_FOLLOWUP_CRON_SECRET>
 *
 * "Qualifying activity" (see `engagementNotificationsLogic.ts` header) is the
 * latest of: a finalized chat/coaching session, a daily check-in, a
 * deep-dive module completion, or path session progress. Eligibility
 * (`isInactivityFollowupDue`) requires ≥5 idle days since that resolved
 * timestamp (falling back to onboarding completion, then account creation,
 * for a user with no qualifying activity yet) and that a follow-up has not
 * already been sent for this exact inactivity streak — a new activity moves
 * the baseline forward and re-arms eligibility after another 5 idle days.
 *
 * Channel: push only (web + native via `pushFanout`) — no email fallback for
 * this notification type.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { canonicalAppOrigin } from "../_shared/appOrigin.ts";
import {
  isInactivityFollowupDue,
  resolveInactivityBaseline,
  type InactivityFollowupProfileRow,
} from "../_shared/engagementNotificationsLogic.ts";
import { parseModuleSchedules } from "../_shared/moduleUnlockLogic.ts";
import { isWebPushConfigured, sendWebPushToSubscription } from "../_shared/webPushDelivery.ts";
import {
  isNativePushConfigured,
  sendNativePushToSubscription,
} from "../_shared/nativePushDelivery.ts";
import { fanOutPushToSubscriptions, type AnyPushSubscriptionRow } from "../_shared/pushFanout.ts";

type ProfileRow = InactivityFollowupProfileRow & {
  moduleSchedules?: unknown;
};

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

  const cronSecret = Deno.env.get("INACTIVITY_FOLLOWUP_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }

  return false;
}

function latestIso(...values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = value;
    }
  }
  return best;
}

function latestModuleCompletionIso(moduleSchedules: unknown): string | null {
  const schedules = parseModuleSchedules(moduleSchedules);
  return latestIso(...Object.values(schedules).map((entry) => entry?.completedAt ?? null));
}

async function resolveLastActivityAt(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data: lastArchive } = await supabase
    .from("coachingSessionArchive")
    .select("finalizedAt")
    .eq("userId", userId)
    .order("finalizedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  let chatActivity: string | null =
    typeof lastArchive?.finalizedAt === "string" ? lastArchive.finalizedAt : null;

  if (!chatActivity) {
    const { data: lastSession } = await supabase
      .from("chatConversation")
      .select("finalizedAt, updatedAt")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    chatActivity = latestIso(
      typeof lastSession?.finalizedAt === "string" ? lastSession.finalizedAt : null,
      typeof lastSession?.updatedAt === "string" ? lastSession.updatedAt : null,
    );
  }

  const { data: lastCheckin } = await supabase
    .from("dailyCheckin")
    .select("date")
    .eq("userId", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lastPathResponse } = await supabase
    .from("pathResponse")
    .select("createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latestIso(
    chatActivity,
    typeof lastCheckin?.date === "string" ? lastCheckin.date : null,
    typeof lastPathResponse?.createdAt === "string" ? lastPathResponse.createdAt : null,
  );
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
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const anyPushConfigured = isWebPushConfigured() || isNativePushConfigured();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, email, firstName, timeZone, onboardingCompleted, onboardingCompletedAt, createdAt, moduleSchedules, inactivityFollowupBaselineActivityAt",
    )
    .eq("onboardingCompleted", true);

  if (profilesError) {
    return json({ error: profilesError.message }, 500);
  }

  let candidateCount = 0;
  let sentCount = 0;
  let expiredSubscriptionsRemoved = 0;
  const stamped: string[] = [];
  const sendResults: Array<{ userId: string; detail: string }> = [];

  for (const row of (profiles ?? []) as ProfileRow[]) {
    const moduleActivity = latestModuleCompletionIso(row.moduleSchedules);
    const otherActivity = await resolveLastActivityAt(supabase, row.id);
    const lastActivityAt = latestIso(moduleActivity, otherActivity);

    if (!isInactivityFollowupDue(row, lastActivityAt, nowMs)) {
      continue;
    }

    candidateCount += 1;
    const baseline = resolveInactivityBaseline(row, lastActivityAt);

    let detail = "push:skipped — no push configured";
    if (anyPushConfigured) {
      const { data: subs } = await supabase
        .from("pushDeviceSubscription")
        .select("id, platform, endpoint, p256dh, auth, deviceToken")
        .eq("userId", row.id);

      const fanout = await fanOutPushToSubscriptions(
        (subs ?? []) as AnyPushSubscriptionRow[],
        {
          title: "Kota is here when you're ready",
          body: "It's been a few days — your dashboard is right where you left it.",
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

    // Stamp the attempt (and the streak baseline it was sent for) regardless
    // of delivery outcome — a dedupe cap per inactivity streak, not a
    // delivery guarantee.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        inactivityFollowupSentAt: nowIso,
        inactivityFollowupBaselineActivityAt: baseline,
        lastNotificationSentAt: nowIso,
      })
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
