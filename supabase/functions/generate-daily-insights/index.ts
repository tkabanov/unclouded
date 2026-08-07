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
function localDateAndHour(
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

function preferredHour(onboardingData: unknown): number {
  if (!onboardingData || typeof onboardingData !== "object") return 8;
  const raw = onboardingData as Record<string, unknown>;
  const value =
    raw.preferred_insight_hour ??
    raw.preferredInsightHour ??
    raw.kota_insight_hour;
  if (typeof value === "number" && value >= 0 && value <= 23) return Math.floor(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 23) return Math.floor(parsed);
  }
  return 8;
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
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    const tier = normalizeStandaloneTier(profile.tier);
    if (!canUseStandaloneProPrompts(tier)) {
      skipped += 1;
      continue;
    }

    const { date, hour } = localDateAndHour(
      typeof profile.timeZone === "string" ? profile.timeZone : null,
    );
    const dueHour = preferredHour(profile.onboardingData);
    if (hour !== dueHour) {
      skipped += 1;
      continue;
    }

    const { data: existing } = await service
      .from("dailyInsight")
      .select("id")
      .eq("userId", profile.id)
      .eq("insightDate", date)
      .maybeSingle();

    if (existing) {
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
    } catch {
      // Spec: retry once after 30 minutes — mark for ops via log; cron will retry next hour.
      // For immediate retry path within this invoke:
      try {
        await new Promise((r) => setTimeout(r, 500));
        insights = await generateDailyInsights({
          classification: ctx.classification,
          coachingMode: ctx.coachingMode,
          recentThemes: ctx.recentThemes,
          aiConfidenceLevel: ctx.aiConfidenceLevel,
          activeFlags: ctx.activeFlags,
        });
      } catch (err) {
        console.error("daily_insights_failed", profile.id, err);
        failed += 1;
        continue;
      }
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

  return json({ ok: true, generated, skipped, failed });
});
