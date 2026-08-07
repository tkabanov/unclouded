/**
 * Prompt 1 — Daily Coaching Insights (scheduled).
 * Auth: service role Bearer or x-cron-secret.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { canonicalAppOrigin } from "../_shared/appOrigin.ts";
import {
  sendWebPushToSubscription,
  type PushSubscriptionRow,
} from "../_shared/webPushDelivery.ts";
import {
  buildStandaloneUserContext,
  canUseStandaloneProPrompts,
  generateDailyInsights,
  normalizeStandaloneTier,
} from "../_shared/standalonePrompts/index.ts";
import {
  dailyInsightPruneBeforeDate,
  dailyInsightsRetryDelayMs,
  preferredInsightHour,
  shouldGenerateDailyInsights,
} from "../_shared/standalonePrompts/dailyInsightsSchedule.ts";

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

  const cronSecret = Deno.env.get("DAILY_INSIGHTS_CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header === cronSecret) return true;
  }
  return false;
}

/** Local YYYY-MM-DD and hour for a profile timezone (fallback America/New_York). */
export function localDateAndHour(
  timeZone: string | null | undefined,
  now = new Date(),
): { date: string; hour: number } {
  const tz = timeZone?.trim() || "America/New_York";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    return { date: `${year}-${month}-${day}`, hour: Number.isFinite(hour) ? hour : 0 };
  } catch {
    const iso = now.toISOString();
    return { date: iso.slice(0, 10), hour: now.getUTCHours() };
  }
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

  const service = createClient(supabaseUrl, serviceKey);
  const { data: profiles, error } = await service
    .from("profiles")
    .select("id, tier, results, onboardingData, timeZone, isActive")
    .in("tier", ["pro", "premium"])
    .eq("isActive", true)
    .limit(500);

  if (error) return json({ error: error.message }, 500);

  const appUrl = canonicalAppOrigin();
  const retryDelayMs = dailyInsightsRetryDelayMs();
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let scheduledRetry = 0;

  for (const profile of profiles ?? []) {
    const tier = normalizeStandaloneTier(profile.tier);
    if (!canUseStandaloneProPrompts(tier)) {
      skipped += 1;
      continue;
    }

    const { date, hour } = localDateAndHour(
      typeof profile.timeZone === "string" ? profile.timeZone : null,
    );
    const dueHour = preferredInsightHour(profile.onboardingData);

    const { data: existing } = await service
      .from("dailyInsight")
      .select("id")
      .eq("userId", profile.id)
      .eq("insightDate", date)
      .maybeSingle();

    const { data: retryRow } = await service
      .from("dailyInsightRetry")
      .select("attemptCount, retryAt")
      .eq("userId", profile.id)
      .eq("insightDate", date)
      .maybeSingle();

    const retryState =
      retryRow && typeof retryRow === "object"
        ? {
            attemptCount:
              typeof retryRow.attemptCount === "number" ? retryRow.attemptCount : 0,
            retryAt: typeof retryRow.retryAt === "string" ? retryRow.retryAt : null,
          }
        : null;

    const gate = shouldGenerateDailyInsights({
      localHour: hour,
      preferredHour: dueHour,
      hasInsightToday: Boolean(existing),
      retry: retryState,
    });

    if (!gate.run) {
      skipped += 1;
      continue;
    }

    const ctx = buildStandaloneUserContext(profile);

    let insights;
    try {
      insights = await generateDailyInsights({
        classification: ctx.classification,
        coachingMode: ctx.coachingMode,
        recentThemes: ctx.recentThemes,
        aiConfidenceLevel: ctx.aiConfidenceLevel,
        activeFlags: ctx.activeFlags,
      });
    } catch (err) {
      console.error("daily_insights_failed", profile.id, err);
      const nextAttempt = (retryState?.attemptCount ?? 0) + 1;
      if (nextAttempt === 1) {
        const retryAt = new Date(Date.now() + retryDelayMs).toISOString();
        await service.from("dailyInsightRetry").upsert(
          {
            userId: profile.id,
            insightDate: date,
            attemptCount: 1,
            retryAt,
          },
          { onConflict: "userId,insightDate" },
        );
        scheduledRetry += 1;
      } else {
        await service.from("dailyInsightRetry").upsert(
          {
            userId: profile.id,
            insightDate: date,
            attemptCount: 2,
            retryAt: null,
          },
          { onConflict: "userId,insightDate" },
        );
        failed += 1;
      }
      continue;
    }

    const { data: inserted, error: insertError } = await service
      .from("dailyInsight")
      .insert({
        userId: profile.id,
        insightDate: date,
        insight1Title: insights.insight_1.title,
        insight1Body: insights.insight_1.body,
        insight2Title: insights.insight_2.title,
        insight2Body: insights.insight_2.body,
        insight3Title: insights.insight_3.title,
        insight3Body: insights.insight_3.body,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted) {
      failed += 1;
      continue;
    }

    await service
      .from("dailyInsightRetry")
      .delete()
      .eq("userId", profile.id)
      .eq("insightDate", date);

    const pruneBefore = dailyInsightPruneBeforeDate(date);
    await service
      .from("dailyInsight")
      .delete()
      .eq("userId", profile.id)
      .lt("insightDate", pruneBefore);

    const { data: subs } = await service
      .from("pushDeviceSubscription")
      .select("id, endpoint, p256dh, auth")
      .eq("userId", profile.id);

    let notified = false;
    for (const row of (subs ?? []) as PushSubscriptionRow[]) {
      const result = await sendWebPushToSubscription(row, {
        title: "Kota left you a message",
        body: "Open your feed to read today's insights from Kota.",
        url: `${appUrl}/dashboard`,
      });
      if (result.ok) notified = true;
    }

    if (notified) {
      await service
        .from("dailyInsight")
        .update({ notifiedAt: new Date().toISOString() })
        .eq("id", inserted.id);
    }

    generated += 1;
  }

  return json({ ok: true, generated, skipped, failed, scheduledRetry });
});
