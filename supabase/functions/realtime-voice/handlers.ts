import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  AI_MONTHLY_LIMIT_CODE,
  checkAiBudget,
  computeCostUsd,
  loadPricing,
  type AiPlanTier,
} from "../_shared/aiUsage.ts";
import { isValidUuid } from "../_shared/uuidHelpers.ts";
import type { buildUserSystemPrompt } from "../chat/buildUserSystemPrompt.ts";
import { CRISIS_RESPONSE_TEXT, classifyCrisisInLiveContext, classifyCrisisInTexts, requiresCrisisHardStop } from "../chat/crisisDetect.ts";
import { enforceFreeTierSessionGate } from "../chat/tierGate.ts";
import { canUseRealtimeConversation } from "../chat/tierGateHelpers.ts";
import { estimatePromptTokens } from "../chat/tokenEstimate.ts";
import { createRealtimeCall, hangupRealtimeCall } from "./openaiCalls.ts";
import {
  REALTIME_HEARTBEAT_SEC,
  REALTIME_IDLE_TIMEOUT_SEC,
  REALTIME_INSTRUCTIONS_SOFT_LIMIT_TOKENS,
  REALTIME_POST_END_GRACE_MS,
  REALTIME_SESSION_MAX_MS,
  buildRealtimeSessionConfig,
  isAllowedRealtimeVoice,
} from "./sessionConfig.ts";
import { REALTIME_TOOL_OUTPUT_MAX_CHARS, findRealtimeTool, type RealtimeTool } from "./tools/registry.ts";
import { deriveUsageStatus, parseRealtimeUsage } from "./usage.ts";

/**
 * NCLDD-57 S3 — `realtime-voice` actions (plan §5.2). Every action loads the session by
 * `id AND "userId" = caller`; writes to `realtimeVoiceSession` / `aiUsageEvent` use the service
 * client, chat rows use the caller's RLS client.
 */

export type RealtimeEnv = {
  apiKey: string | null;
  model: string;
  transcribeModel: string;
};

export type BuildPrompt = typeof buildUserSystemPrompt;

export type RealtimeContext = {
  userClient: SupabaseClient;
  admin: SupabaseClient;
  userId: string;
  env: RealtimeEnv;
  fetch: typeof fetch;
  now: () => Date;
  tools: readonly RealtimeTool[];
  buildPrompt: BuildPrompt;
};

export type ActionResult = { status: number; body: Record<string, unknown> };

export const REALTIME_END_REASONS = [
  "user_ended",
  "max_duration",
  "idle_timeout",
  "network_lost",
  "connect_failed",
  "mic_lost",
  "budget_reached",
  "crisis",
  "error",
  "abandoned",
] as const;
type EndReason = (typeof REALTIME_END_REASONS)[number];

const MAX_SDP_CHARS = 20_000;
const MAX_COUNTER = 100_000;
const MAX_TRANSCRIPT_ITEMS = 50;
const MAX_TRANSCRIPT_TEXT = 8000;
const ITEM_ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;
/** Saved user turns rescanned together with new ones (plan §5.2 `transcript`). */
const CRISIS_CONTEXT_TURNS = 3;
/** Retry may reuse a conversation at most this many realtime sessions (Free cap counts per conversation). */
export const MAX_SESSIONS_PER_CONVERSATION = 5;
/** Only these endings are recoverable by Retry in the same conversation (client `canRetryAfter`). */
const RETRYABLE_END_REASONS = ["network_lost", "connect_failed", "mic_lost", "error"];
/** OpenAI ends any call by 60 min, so older swept calls need no hang-up. */
const CALL_LIFETIME_MS = 65 * 60_000;
/** Self-reported "seen" counters can't exceed one event per second of connected time (+ slack). */
const SEEN_SLACK = 10;

type SessionRow = {
  id: string;
  userId: string;
  conversationId: string | null;
  openaiCallId: string | null;
  model: string;
  voice: string;
  transcriptionModel: string | null;
  status: "connecting" | "active" | "ended" | "failed";
  endReason: string | null;
  usageStatus: string;
  responsesSeen: number;
  responsesReported: number;
  transcriptionsSeen: number;
  transcriptionsReported: number;
  startedAt: string;
  connectedAt: string | null;
  endedAt: string | null;
  expiresAt: string;
  planTierAtStart: AiPlanTier;
};

const OPEN_STATUSES = ["connecting", "active"];

function ok(body: Record<string, unknown> = {}): ActionResult {
  return { status: 200, body: { ok: true, ...body } };
}

function fail(status: number, code: string, error: string, extra: Record<string, unknown> = {}): ActionResult {
  return { status, body: { error, code, ...extra } };
}

const badRequest = (error = "Invalid request.") => fail(400, "invalid_request", error);
const notFound = () => fail(404, "session_not_found", "Conversation session not found.");
const notActive = () => fail(409, "session_not_active", "This conversation has ended.");

function counter(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_COUNTER ? value : null;
}

function isOpen(row: SessionRow): boolean {
  return OPEN_STATUSES.includes(row.status);
}

/** Open, or ended recently enough for the final usage/transcript flush. */
function acceptsLateWrites(row: SessionRow, now: Date): boolean {
  if (isOpen(row)) return true;
  if (row.status !== "ended" || !row.endedAt) return false;
  return now.getTime() - new Date(row.endedAt).getTime() <= REALTIME_POST_END_GRACE_MS;
}

async function loadOwnedSession(ctx: RealtimeContext, id: unknown): Promise<SessionRow | null> {
  if (typeof id !== "string" || !isValidUuid(id)) return null;
  const { data, error } = await ctx.admin
    .from("realtimeVoiceSession")
    .select("*")
    .eq("id", id.trim())
    .eq("userId", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(`load session failed: ${error.code ?? error.message}`);
  return (data as SessionRow | null) ?? null;
}

function durationSeconds(row: Pick<SessionRow, "connectedAt">, at: Date): number {
  if (!row.connectedAt) return 0;
  return Math.max(0, Math.round((at.getTime() - new Date(row.connectedAt).getTime())) / 1000);
}

/** Keep stored counters monotonic and plausible for the connected time (L2). */
function capSeen(
  row: Pick<SessionRow, "connectedAt" | "responsesSeen" | "transcriptionsSeen">,
  reported: { responsesSeen: number; transcriptionsSeen: number },
  at: Date,
): { responsesSeen: number; transcriptionsSeen: number } {
  const limit = Math.ceil(durationSeconds(row, at)) + SEEN_SLACK;
  return {
    responsesSeen: Math.max(row.responsesSeen, Math.min(reported.responsesSeen, limit)),
    transcriptionsSeen: Math.max(row.transcriptionsSeen, Math.min(reported.transcriptionsSeen, limit)),
  };
}

/**
 * `realtime_voice_sweep()` is SQL and cannot hang up OpenAI calls; hang up the caller's swept
 * calls here so a client that went silent can't keep a call running into the next one.
 */
async function hangupAbandonedCalls(ctx: RealtimeContext): Promise<void> {
  const since = new Date(ctx.now().getTime() - CALL_LIFETIME_MS).toISOString();
  const { data, error } = await ctx.admin
    .from("realtimeVoiceSession")
    .select("openaiCallId, startedAt")
    .eq("userId", ctx.userId)
    .eq("status", "ended")
    .eq("endReason", "abandoned");
  if (error) {
    console.warn("abandoned calls lookup failed", error.code ?? error.message);
    return;
  }
  const rows = (data ?? []) as Array<{ openaiCallId: string | null; startedAt: string }>;
  await Promise.all(
    rows.filter((row) => row.openaiCallId && row.startedAt >= since).map((row) => hangup(ctx, row)),
  );
}

/** Retry reuse: the latest session of the conversation failed recoverably, and reuse is bounded. */
async function canRetryInConversation(ctx: RealtimeContext, conversationId: string): Promise<boolean> {
  const { data, error } = await ctx.admin
    .from("realtimeVoiceSession")
    .select("endReason, startedAt")
    .eq("userId", ctx.userId)
    .eq("conversationId", conversationId)
    .order("startedAt", { ascending: false });
  if (error) throw new Error(`retry check failed: ${error.code ?? error.message}`);
  const rows = (data ?? []) as Array<{ endReason: string | null }>;
  if (rows.length === 0) return true;
  if (rows.length >= MAX_SESSIONS_PER_CONVERSATION) return false;
  return rows[0].endReason !== null && RETRYABLE_END_REASONS.includes(rows[0].endReason);
}

async function hangup(ctx: RealtimeContext, row: Pick<SessionRow, "openaiCallId">): Promise<void> {
  if (row.openaiCallId && ctx.env.apiKey) await hangupRealtimeCall(ctx.fetch, ctx.env.apiKey, row.openaiCallId);
}

/**
 * Close an open session. Guarded by `status IN (connecting, active)` so a session closed by
 * `realtime_voice_sweep()` (or a concurrent `end`) is never revived. Returns the stored row.
 */
async function closeSession(
  ctx: RealtimeContext,
  row: SessionRow,
  reason: EndReason,
  counters?: { responsesSeen: number; transcriptionsSeen: number },
): Promise<SessionRow> {
  const at = ctx.now();
  const next = capSeen(row, counters ?? { responsesSeen: 0, transcriptionsSeen: 0 }, at);
  const usageStatus = deriveUsageStatus({ ...row, ...next });
  const { data, error } = await ctx.admin
    .from("realtimeVoiceSession")
    .update({
      ...next,
      status: "ended",
      endReason: reason,
      endedAt: at.toISOString(),
      durationSeconds: durationSeconds(row, at),
      usageStatus,
    })
    .eq("id", row.id)
    .eq("userId", ctx.userId)
    .in("status", OPEN_STATUSES)
    .select("*");
  if (error) throw new Error(`end session failed: ${error.code ?? error.message}`);
  const updated = (data as SessionRow[] | null)?.[0];
  if (updated) {
    await hangup(ctx, row);
    return updated;
  }
  return (await loadOwnedSession(ctx, row.id)) ?? row;
}

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

async function ownedOpenConversation(ctx: RealtimeContext, conversationId: string) {
  const { data, error } = await ctx.userClient
    .from("chatConversation")
    .select("id, sessionType, finalizedAt")
    .eq("id", conversationId)
    .eq("userId", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(`load conversation failed: ${error.code ?? error.message}`);
  const row = data as { id: string; sessionType: string; finalizedAt: string | null } | null;
  return row && row.sessionType === "voice_conversation" && !row.finalizedAt ? row : null;
}

async function handleStart(ctx: RealtimeContext, body: Record<string, unknown>): Promise<ActionResult> {
  const { sdpOffer, voice } = body;
  if (typeof sdpOffer !== "string" || !sdpOffer.startsWith("v=0") || sdpOffer.length > MAX_SDP_CHARS) {
    return badRequest("A valid SDP offer is required.");
  }
  if (!isAllowedRealtimeVoice(voice)) return fail(400, "invalid_voice", "Unknown voice.");
  const requestedConversation = body.conversationId;
  if (requestedConversation !== undefined && requestedConversation !== null) {
    if (typeof requestedConversation !== "string" || !isValidUuid(requestedConversation)) return badRequest();
  }
  if (!ctx.env.apiKey) {
    console.error("realtime-voice: OPENAI_API_KEY is not set");
    return fail(502, "realtime_unavailable", "Conversation mode is unavailable right now.");
  }

  // 1 + 6. Tier gate and monthly voice budget (one RPC; fails open like chat).
  const budget = await checkAiBudget(ctx.admin, ctx.userId, "voice");
  const tier: AiPlanTier = budget.tier ?? "free";
  if (!canUseRealtimeConversation(tier)) {
    return fail(402, "realtime_conversation_tier_required", "Conversation mode isn't included in your plan.");
  }
  if (!budget.allowed) {
    return fail(402, AI_MONTHLY_LIMIT_CODE, "Monthly AI voice limit reached.", { mode: "voice" });
  }

  // 3. Close stale sessions (all users; cheap), then allow one open session per user.
  const sweep = await ctx.admin.rpc("realtime_voice_sweep");
  if (sweep.error) console.warn("realtime_voice_sweep failed", sweep.error.code ?? sweep.error.message);
  await hangupAbandonedCalls(ctx);
  const { data: openRows, error: openError } = await ctx.admin
    .from("realtimeVoiceSession")
    .select("id")
    .eq("userId", ctx.userId)
    .in("status", OPEN_STATUSES)
    .limit(1);
  if (openError) throw new Error(`open session check failed: ${openError.code ?? openError.message}`);
  if ((openRows ?? []).length > 0) {
    return fail(409, "realtime_session_active", "A conversation is already running in another tab.");
  }

  // 4. Conversation: reuse (Retry) only an unfinished voice_conversation of the caller.
  let conversationId: string;
  let createdConversation = false;
  if (typeof requestedConversation === "string") {
    const existing = await ownedOpenConversation(ctx, requestedConversation.trim());
    if (!existing || !(await canRetryInConversation(ctx, existing.id))) {
      return fail(400, "invalid_conversation", "This conversation can't be continued.");
    }
    conversationId = existing.id;
  } else {
    const { data, error } = await ctx.userClient
      .from("chatConversation")
      .insert({ title: "Voice conversation", userId: ctx.userId, sessionType: "voice_conversation" })
      .select("id")
      .single();
    if (error || !data) throw new Error(`create conversation failed: ${error?.code ?? error?.message}`);
    conversationId = (data as { id: string }).id;
    createdConversation = true;
  }

  const discardCreated = async () => {
    if (!createdConversation) return;
    const { error } = await ctx.userClient.from("chatConversation").delete().eq("id", conversationId).eq("userId", ctx.userId);
    if (error) console.warn("discard conversation failed", error.code ?? error.message);
  };

  // 5. Free-tier monthly sessions (counted per conversation: Retry is not charged twice).
  const gate = await enforceFreeTierSessionGate(ctx.userClient, ctx.userId, conversationId, "session_open");
  if (gate.allowed === false) {
    const denied = gate as Extract<typeof gate, { allowed: false }>;
    await discardCreated();
    return fail(402, denied.code, denied.message);
  }

  // 7. Same prompt pipeline as chat (S2) with the realtime addendum.
  const prompt = await ctx.buildPrompt({
    userClient: ctx.userClient,
    serviceClient: ctx.admin,
    userId: ctx.userId,
    sessionType: "voice_conversation",
    exchangeCount: 0,
  });
  if (!prompt) {
    await discardCreated();
    return fail(404, "profile_not_found", "Profile not found.");
  }

  // Chat refuses coaching when the live context already carries a crisis signal; same here.
  const liveCrisis = classifyCrisisInLiveContext(prompt.profile.liveContext);
  if (requiresCrisisHardStop(liveCrisis)) {
    await discardCreated();
    // `error` carries the crisis text so the client shows it as the message (full crisis UI: T-031).
    return fail(403, "crisis", CRISIS_RESPONSE_TEXT, {
      crisis: { level: liveCrisis, text: CRISIS_RESPONSE_TEXT },
    });
  }

  const promptTokens = estimatePromptTokens(prompt.system);
  if (promptTokens > REALTIME_INSTRUCTIONS_SOFT_LIMIT_TOKENS) {
    console.warn("realtime-voice: instructions above soft limit", { promptTokens });
  }

  // 10 (row first). The call is tracked before it exists, so a crash between the two is swept.
  const startedAt = ctx.now();
  const expiresAt = new Date(startedAt.getTime() + REALTIME_SESSION_MAX_MS);
  const { data: inserted, error: insertError } = await ctx.admin
    .from("realtimeVoiceSession")
    .insert({
      userId: ctx.userId,
      conversationId,
      model: ctx.env.model,
      voice,
      transcriptionModel: ctx.env.transcribeModel,
      status: "connecting",
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      planTierAtStart: tier,
    })
    .select("*")
    .single();
  if (insertError?.code === "23505") {
    // Lost the race to a concurrent start (one open session per user, unique index).
    await discardCreated();
    return fail(409, "realtime_session_active", "A conversation is already running in another tab.");
  }
  if (insertError || !inserted) {
    await discardCreated();
    throw new Error(`insert session failed: ${insertError?.code ?? insertError?.message}`);
  }
  const session = inserted as SessionRow;

  // 8 + 9. Session config and the OpenAI call.
  const config = buildRealtimeSessionConfig({
    model: ctx.env.model,
    instructions: prompt.system,
    voice,
    transcribeModel: ctx.env.transcribeModel,
    tools: ctx.tools,
  });
  const result = await createRealtimeCall(ctx.fetch, ctx.env.apiKey, sdpOffer, config);
  if (result.ok === false) {
    const call = result as Extract<typeof result, { ok: false }>;
    console.error("realtime-voice: OpenAI call failed", {
      status: call.status,
      ...(call.status >= 400 && call.status < 500 && promptTokens > REALTIME_INSTRUCTIONS_SOFT_LIMIT_TOKENS
        ? { reason: "prompt_too_large" }
        : {}),
    });
    const at = ctx.now().toISOString();
    await ctx.admin
      .from("realtimeVoiceSession")
      .update({ status: "failed", endReason: "connect_failed", endedAt: at, durationSeconds: 0, usageStatus: "complete" })
      .eq("id", session.id)
      .eq("userId", ctx.userId)
      .then(({ error }) => {
        if (error) console.warn("mark session failed failed", error.code ?? error.message);
      });
    return fail(502, "realtime_unavailable", "Conversation mode is unavailable right now.");
  }

  const call = result as Extract<typeof result, { ok: true }>;
  if (call.callId) {
    const { error } = await ctx.admin
      .from("realtimeVoiceSession")
      .update({ openaiCallId: call.callId })
      .eq("id", session.id)
      .eq("userId", ctx.userId);
    if (error) console.warn("store call id failed", error.code ?? error.message);
  } else {
    console.warn("realtime-voice: no call id in Location header");
  }

  return ok({
    realtimeSessionId: session.id,
    conversationId,
    sdpAnswer: call.sdpAnswer,
    model: ctx.env.model,
    voice,
    expiresAt: expiresAt.toISOString(),
    heartbeatSec: REALTIME_HEARTBEAT_SEC,
    idleTimeoutSec: REALTIME_IDLE_TIMEOUT_SEC,
  });
}

// ---------------------------------------------------------------------------
// connected / heartbeat / end
// ---------------------------------------------------------------------------

async function handleConnected(ctx: RealtimeContext, body: Record<string, unknown>): Promise<ActionResult> {
  const row = await loadOwnedSession(ctx, body.realtimeSessionId);
  if (!row) return notFound();
  if (row.status === "active") return ok();
  if (row.status !== "connecting") return notActive();
  const at = ctx.now().toISOString();
  const { error } = await ctx.admin
    .from("realtimeVoiceSession")
    .update({ status: "active", connectedAt: at, lastHeartbeatAt: at })
    .eq("id", row.id)
    .eq("userId", ctx.userId)
    .eq("status", "connecting");
  if (error) throw new Error(`connected failed: ${error.code ?? error.message}`);
  return ok();
}

async function handleHeartbeat(ctx: RealtimeContext, body: Record<string, unknown>): Promise<ActionResult> {
  const responsesSeen = counter(body.responsesSeen);
  const transcriptionsSeen = counter(body.transcriptionsSeen);
  if (responsesSeen === null || transcriptionsSeen === null) return badRequest();
  const row = await loadOwnedSession(ctx, body.realtimeSessionId);
  if (!row) return notFound();
  if (!isOpen(row)) return notActive();

  const now = ctx.now();
  const seen = capSeen(row, { responsesSeen, transcriptionsSeen }, now);
  const { error } = await ctx.admin
    .from("realtimeVoiceSession")
    .update({
      ...seen,
      lastHeartbeatAt: now.toISOString(),
    })
    .eq("id", row.id)
    .eq("userId", ctx.userId)
    .in("status", OPEN_STATUSES);
  if (error) throw new Error(`heartbeat failed: ${error.code ?? error.message}`);

  // Stops are enforced here (session closed + call hung up), not left to the client.
  if (now.getTime() >= new Date(row.expiresAt).getTime()) {
    await closeSession(ctx, { ...row, ...seen }, "max_duration");
    return ok({ stop: "max_duration" });
  }
  const budget = await checkAiBudget(ctx.admin, ctx.userId, "voice");
  if (budget.allowed) return ok();
  await closeSession(ctx, { ...row, ...seen }, "budget_reached");
  return ok({ stop: "budget_reached" });
}

async function handleEnd(ctx: RealtimeContext, body: Record<string, unknown>): Promise<ActionResult> {
  const reason = body.reason;
  if (typeof reason !== "string" || !(REALTIME_END_REASONS as readonly string[]).includes(reason)) {
    return badRequest("Unknown end reason.");
  }
  const responsesSeen = counter(body.responsesSeen ?? 0);
  const transcriptionsSeen = counter(body.transcriptionsSeen ?? 0);
  if (responsesSeen === null || transcriptionsSeen === null) return badRequest();
  const row = await loadOwnedSession(ctx, body.realtimeSessionId);
  if (!row) return notFound();
  if (!isOpen(row)) return ok({ usageStatus: row.usageStatus });
  const closed = await closeSession(ctx, row, reason as EndReason, { responsesSeen, transcriptionsSeen });
  return ok({ usageStatus: closed.usageStatus });
}

// ---------------------------------------------------------------------------
// usage
// ---------------------------------------------------------------------------

async function handleUsage(ctx: RealtimeContext, body: Record<string, unknown>): Promise<ActionResult> {
  const parsed = parseRealtimeUsage(body);
  if (!parsed) return badRequest("Invalid usage payload.");
  const row = await loadOwnedSession(ctx, body.realtimeSessionId);
  if (!row) return notFound();
  const now = ctx.now();
  if (!acceptsLateWrites(row, now)) return notActive();

  // The model comes from the session row, never from the payload.
  const model = parsed.kind === "response" ? row.model : row.transcriptionModel;
  if (!model) return badRequest("This session has no transcription model.");
  const source = parsed.kind === "response" ? "realtime_response" : "realtime_transcription";
  const pricing = await loadPricing(ctx.admin);
  const { costUsd, pricingMissing } = computeCostUsd(pricing, "openai", model, parsed.usage, now);

  const { data, error } = await ctx.admin
    .from("aiUsageEvent")
    .upsert(
      {
        userId: ctx.userId,
        conversationId: row.conversationId,
        realtimeSessionId: row.id,
        externalEventId: parsed.externalEventId,
        mode: "voice",
        source,
        provider: "openai",
        model,
        inputTokens: parsed.usage.inputTokens,
        cachedInputTokens: parsed.usage.cachedInputTokens,
        outputTokens: parsed.usage.outputTokens,
        audioInputTokens: parsed.usage.audioInputTokens,
        cachedAudioInputTokens: parsed.usage.cachedAudioInputTokens,
        audioOutputTokens: parsed.usage.audioOutputTokens,
        audioSeconds: parsed.usage.audioSeconds,
        ttsChars: 0,
        costUsd,
        pricingMissing,
        planTierAtEvent: row.planTierAtStart,
      },
      { onConflict: "realtimeSessionId,externalEventId", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`usage insert failed: ${error.code ?? error.message}`);
  const duplicate = (data ?? []).length === 0;
  if (duplicate) return ok({ duplicate: true });

  // Recount instead of increment: idempotent and safe under concurrent calls.
  const { count, error: countError } = await ctx.admin
    .from("aiUsageEvent")
    .select("id", { count: "exact", head: true })
    .eq("realtimeSessionId", row.id)
    .eq("source", source);
  if (countError) throw new Error(`usage recount failed: ${countError.code ?? countError.message}`);
  const reportedKey = parsed.kind === "response" ? "responsesReported" : "transcriptionsReported";
  const update: Record<string, unknown> = { [reportedKey]: count ?? 0 };
  if (row.status === "ended") {
    update.usageStatus = deriveUsageStatus({ ...row, [reportedKey]: count ?? 0 });
  }
  const { error: updateError } = await ctx.admin
    .from("realtimeVoiceSession")
    .update(update)
    .eq("id", row.id)
    .eq("userId", ctx.userId);
  if (updateError) throw new Error(`usage counter failed: ${updateError.code ?? updateError.message}`);
  return ok({ duplicate: false });
}

// ---------------------------------------------------------------------------
// transcript
// ---------------------------------------------------------------------------

type TranscriptItem = { itemId: string; role: "user" | "assistant"; text: string; interrupted: boolean };

function parseTranscriptItems(raw: unknown): TranscriptItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TRANSCRIPT_ITEMS) return null;
  const items: TranscriptItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    if (typeof item.itemId !== "string" || !ITEM_ID.test(item.itemId) || seen.has(item.itemId)) return null;
    if (item.role !== "user" && item.role !== "assistant") return null;
    if (typeof item.text !== "string" || item.text.length > MAX_TRANSCRIPT_TEXT) return null;
    seen.add(item.itemId);
    items.push({ itemId: item.itemId, role: item.role, text: item.text.trim(), interrupted: item.interrupted === true });
  }
  return items;
}

async function handleTranscript(ctx: RealtimeContext, body: Record<string, unknown>): Promise<ActionResult> {
  const items = parseTranscriptItems(body.items);
  if (!items) return badRequest("Invalid transcript items.");
  const row = await loadOwnedSession(ctx, body.realtimeSessionId);
  if (!row) return notFound();
  if (!acceptsLateWrites(row, ctx.now())) return notActive();
  // Only the session's own conversation, never one from the request body.
  if (!row.conversationId) return fail(410, "conversation_gone", "This conversation no longer exists.");
  const conversationId = row.conversationId;

  const { data: conversation, error: convError } = await ctx.userClient
    .from("chatConversation")
    .select("id")
    .eq("id", conversationId)
    .eq("userId", ctx.userId)
    .maybeSingle();
  if (convError) throw new Error(`load conversation failed: ${convError.code ?? convError.message}`);
  if (!conversation) return fail(410, "conversation_gone", "This conversation no longer exists.");

  const rows = items
    .filter((item) => item.text.length > 0)
    .map((item) => ({
      conversationId,
      userId: ctx.userId,
      content: item.text,
      sender: item.role === "assistant" ? "assistant" : "user",
      isFromUser: item.role === "user",
      realtimeItemId: item.itemId,
    }));

  // Crisis scan of new user turns with a few saved ones as context (same detector as chat).
  const newUserTexts = items.filter((item) => item.role === "user" && item.text).map((item) => item.text);
  let crisisLevel = null as ReturnType<typeof classifyCrisisInTexts>;
  if (newUserTexts.length > 0) {
    const { data: recent } = await ctx.userClient
      .from("chatMessage")
      .select("content")
      .eq("conversationId", conversationId)
      .eq("isFromUser", true)
      .order("createdAt", { ascending: false })
      .limit(CRISIS_CONTEXT_TURNS);
    const context = ((recent ?? []) as Array<{ content: unknown }>)
      .map((message) => (typeof message.content === "string" ? message.content : ""))
      .filter(Boolean)
      .reverse();
    crisisLevel = classifyCrisisInTexts([...context, ...newUserTexts]);
  }

  if (rows.length > 0) {
    const { error } = await ctx.userClient
      .from("chatMessage")
      .upsert(rows, { onConflict: "conversationId,realtimeItemId", ignoreDuplicates: true });
    if (error) throw new Error(`transcript insert failed: ${error.code ?? error.message}`);
    const { error: touchError } = await ctx.userClient
      .from("chatConversation")
      .update({ updatedAt: ctx.now().toISOString() })
      .eq("id", conversationId)
      .eq("userId", ctx.userId);
    if (touchError) console.warn("touch conversation failed", touchError.code ?? touchError.message);
  }

  if (!requiresCrisisHardStop(crisisLevel)) return ok();

  // Same aftercare flags as chat (REQ-03), then end the call on the server too.
  const flags = await Promise.all([
    ctx.userClient.from("profiles").update({ hasPriorCrisisSession: true }).eq("id", ctx.userId),
    ctx.userClient
      .from("chatConversation")
      .update({ hadCrisisEscalation: true })
      .eq("id", conversationId)
      .eq("userId", ctx.userId),
  ]);
  for (const flag of flags) {
    if (flag.error) console.warn("crisis flag failed", flag.error.code ?? flag.error.message);
  }
  if (isOpen(row)) await closeSession(ctx, row, "crisis");
  return ok({ crisis: { level: crisisLevel, text: CRISIS_RESPONSE_TEXT } });
}

// ---------------------------------------------------------------------------
// tool
// ---------------------------------------------------------------------------

async function handleTool(ctx: RealtimeContext, body: Record<string, unknown>): Promise<ActionResult> {
  const { callId, name } = body;
  if (typeof callId !== "string" || !ITEM_ID.test(callId) || typeof name !== "string" || !TOOL_NAME.test(name)) {
    return badRequest();
  }
  const row = await loadOwnedSession(ctx, body.realtimeSessionId);
  if (!row) return notFound();
  if (row.status !== "active") return notActive();

  const tool = findRealtimeTool(name, ctx.tools);
  if (!tool) return { status: 200, body: { error: "tool_not_available" } };

  let raw: unknown;
  try {
    raw = typeof body.arguments === "string" && body.arguments.trim() ? JSON.parse(body.arguments) : {};
  } catch {
    return { status: 200, body: { error: "invalid_arguments" } };
  }
  const args = tool.parseArgs(raw);
  if (args === null) return { status: 200, body: { error: "invalid_arguments" } };

  try {
    const output = await tool.handler(
      { userClient: ctx.userClient, userId: ctx.userId, conversationId: row.conversationId },
      args,
    );
    return { status: 200, body: { output: String(output).slice(0, REALTIME_TOOL_OUTPUT_MAX_CHARS) } };
  } catch (err) {
    console.warn("realtime tool failed", name, err instanceof Error ? err.name : "error");
    return { status: 200, body: { error: "tool_failed" } };
  }
}

// ---------------------------------------------------------------------------

export const REALTIME_ACTIONS = ["start", "connected", "heartbeat", "usage", "transcript", "tool", "end"] as const;
export type RealtimeAction = (typeof REALTIME_ACTIONS)[number];

export function isRealtimeAction(value: unknown): value is RealtimeAction {
  return typeof value === "string" && (REALTIME_ACTIONS as readonly string[]).includes(value);
}

export async function handleRealtimeAction(
  ctx: RealtimeContext,
  action: RealtimeAction,
  body: Record<string, unknown>,
): Promise<ActionResult> {
  switch (action) {
    case "start":
      return handleStart(ctx, body);
    case "connected":
      return handleConnected(ctx, body);
    case "heartbeat":
      return handleHeartbeat(ctx, body);
    case "usage":
      return handleUsage(ctx, body);
    case "transcript":
      return handleTranscript(ctx, body);
    case "tool":
      return handleTool(ctx, body);
    case "end":
      return handleEnd(ctx, body);
  }
}
