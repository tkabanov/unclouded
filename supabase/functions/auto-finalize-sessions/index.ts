/**
 * Scheduled auto-finalize of abandoned AI sessions (text, voice messages, realtime conversation).
 *
 * Invoke via pg_cron → invoke_scheduled_edge_function('auto-finalize-sessions'):
 *   POST /functions/v1/auto-finalize-sessions
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Picks conversations with no activity for AUTO_FINALIZE_IDLE_HOURS (default 24) and runs the
 * same `session_finalize` core as the chat edge (memory, archive, finalizedAt, memory facts,
 * insights by consent). Usage is recorded; the monthly budget is not enforced (finalize never is).
 */
import type { UIMessage } from "npm:ai";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  modeFromSessionType,
  normalizeUsage,
  recordAiUsage,
  type AiUsageMode,
  type AiUsageSource,
} from "../_shared/aiUsage.ts";
import { createChatModel, resolveOpenAiModelId } from "../_shared/openai-provider.ts";
import { applyRequestLiveContext, loadUserPromptInputs } from "../chat/buildUserSystemPrompt.ts";
import {
  classifyCrisisInThread,
  extractAllUserTexts,
  requiresCrisisHardStop,
} from "../chat/crisisDetect.ts";
import { runSessionFinalize } from "../chat/sessionMemory/runSessionFinalize.ts";
import { truncateConversationMessages } from "../chat/truncateConversationMessages.ts";
import { scheduleEdgeBackgroundWork } from "../_shared/edgeBackground.ts";

const DEFAULT_IDLE_HOURS = 24;
const BATCH_LIMIT = 10;

type IdleConversation = {
  conversationId: string;
  userId: string;
  sessionType: string | null;
  lastActivityAt: string;
};

type Outcome = "finalized" | "crisis_skipped" | "no_profile" | "already_finalized" | "failed";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function idleHours(): number {
  const raw = Number(Deno.env.get("AUTO_FINALIZE_IDLE_HOURS"));
  return Number.isFinite(raw) && raw >= 1 ? raw : DEFAULT_IDLE_HOURS;
}

function archiveSessionType(sessionType: string | null): "text" | "voice" | "voice_conversation" {
  return sessionType === "voice" || sessionType === "voice_conversation" ? sessionType : "text";
}

async function loadThread(admin: SupabaseClient, conversationId: string): Promise<UIMessage[]> {
  const { data, error } = await admin
    .from("chatMessage")
    .select("id, content, isFromUser")
    .eq("conversationId", conversationId)
    .order("createdAt", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => typeof row.content === "string" && row.content.trim())
    .map((row) => ({
      id: row.id as string,
      role: row.isFromUser ? ("user" as const) : ("assistant" as const),
      parts: [{ type: "text" as const, text: row.content as string }],
    }));
}

async function finalizeOne(
  admin: SupabaseClient,
  model: ReturnType<typeof createChatModel>,
  modelId: string,
  row: IdleConversation,
): Promise<Outcome> {
  // The user may have pressed End since the list was read.
  const { data: current } = await admin
    .from("chatConversation")
    .select("finalizedAt")
    .eq("id", row.conversationId)
    .maybeSingle();
  if (current?.finalizedAt) return "already_finalized";

  const uiMessages = truncateConversationMessages(await loadThread(admin, row.conversationId));

  // Chat never finalizes a crisis thread; flag it so it is not picked up again.
  if (requiresCrisisHardStop(classifyCrisisInThread(uiMessages))) {
    await admin
      .from("chatConversation")
      .update({ hadCrisisEscalation: true })
      .eq("id", row.conversationId);
    return "crisis_skipped";
  }

  const inputs = await loadUserPromptInputs({
    userClient: admin,
    serviceClient: admin,
    userId: row.userId,
  });
  if (!inputs) return "no_profile";

  const sessionType = archiveSessionType(row.sessionType);
  const conversationMode = modeFromSessionType(sessionType);
  applyRequestLiveContext(inputs.profile, {
    sessionType,
    exchangeCount: extractAllUserTexts(uiMessages).length,
  });

  const trackUsage = (
    source: AiUsageSource,
    usage: unknown,
    usedModel: string = modelId,
    mode: AiUsageMode = conversationMode,
  ) => {
    scheduleEdgeBackgroundWork(
      recordAiUsage(admin, {
        userId: row.userId,
        conversationId: row.conversationId,
        mode,
        source,
        model: usedModel,
        usage: normalizeUsage(usage),
      }),
    );
  };

  const parsed = await runSessionFinalize({
    db: admin,
    serviceClient: admin,
    model,
    modelId,
    userId: row.userId,
    conversationId: row.conversationId,
    sessionType,
    conversationMode,
    ownedConversation: true,
    profileData: inputs.profile,
    uiMessages,
    trackUsage,
  });
  return parsed ? "finalized" : "failed";
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!bearer || bearer !== serviceKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  let model;
  try {
    model = createChatModel();
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "AI not configured" }, 500);
  }
  const modelId = resolveOpenAiModelId();
  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin.rpc("list_idle_unfinalized_conversations", {
    p_idle: `${idleHours()} hours`,
    p_limit: BATCH_LIMIT,
  });
  if (error) {
    return json({ error: error.message }, 500);
  }

  const results: Array<{ conversationId: string; outcome: Outcome }> = [];
  for (const row of (data ?? []) as IdleConversation[]) {
    let outcome: Outcome;
    try {
      outcome = await finalizeOne(admin, model, modelId, row);
    } catch (err) {
      console.error("auto-finalize failed", { conversationId: row.conversationId, err });
      outcome = "failed";
    }
    results.push({ conversationId: row.conversationId, outcome });
  }

  return json({ ok: true, processed: results.length, results });
});
