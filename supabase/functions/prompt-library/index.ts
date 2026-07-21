/**
 * REQ-13 — Prompt library admin: draft, test runs, approval, promote gate.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  clearPromptLibraryLayerCache,
  clonePromptLibraryVersionFromProduction,
  ensureProductionPromptLibrarySeeded,
  fetchLatestDraftPromptLibraryVersion,
  fetchPromptLibraryVersionByStatus,
} from "../chat/prompt/loadPromptLibraryVersion.ts";
import { STATIC_PROMPT_LAYER_ENTRIES } from "../chat/prompt/promptLibraryStaticLayers.ts";

type PromptLibraryAction =
  | "listVersions"
  | "createDraft"
  | "updateLayer"
  | "saveTestRun"
  | "approve"
  | "promote";

type RequestBody = {
  action?: PromptLibraryAction;
  versionId?: string;
  label?: string;
  layerKey?: string;
  content?: string;
  testRunId?: string;
  resultsJson?: unknown;
  flaggedCount?: number;
  notes?: string;
  overrideReason?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return json({ error: "Unauthorized" }, 401);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("roleType")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError || profile?.roleType !== "admin") {
    return json({ error: "Forbidden" }, 403);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action;
  if (!action) {
    return json({ error: "action is required" }, 400);
  }

  try {
    switch (action) {
      case "listVersions": {
        await ensureProductionPromptLibrarySeeded(adminClient, auth.user.id);
        const { data, error } = await adminClient
          .from("promptLibraryVersion")
          .select("id, status, label, approvedAt, promotedAt, createdAt, updatedAt")
          .order("updatedAt", { ascending: false })
          .limit(20);
        if (error) throw error;

        const versionId = body.versionId?.trim();
        let layers: Array<{ layerKey: string; content: string; sortOrder: number }> = [];
        if (versionId) {
          const { data: layerRows, error: layerError } = await adminClient
            .from("promptLibraryLayer")
            .select("layerKey, content, sortOrder")
            .eq("versionId", versionId)
            .order("sortOrder", { ascending: true });
          if (layerError) throw layerError;
          layers = (layerRows ?? []) as typeof layers;
        }

        return json({ ok: true, versions: data ?? [], layers, layerKeys: STATIC_PROMPT_LAYER_ENTRIES.map((e) => e.layerKey) });
      }

      case "createDraft": {
        const draft = await clonePromptLibraryVersionFromProduction(
          adminClient,
          auth.user.id,
          body.label?.trim() || `Draft ${new Date().toISOString().slice(0, 10)}`,
        );
        return json({ ok: true, version: draft });
      }

      case "updateLayer": {
        const versionId = body.versionId?.trim();
        const layerKey = body.layerKey?.trim();
        const content = body.content;
        if (!versionId || !layerKey || typeof content !== "string") {
          return json({ error: "versionId, layerKey, and content are required" }, 400);
        }

        const { data: version, error: versionError } = await adminClient
          .from("promptLibraryVersion")
          .select("status")
          .eq("id", versionId)
          .maybeSingle();
        if (versionError) throw versionError;
        if (!version || version.status !== "draft") {
          return json({ error: "Only draft versions can be edited" }, 400);
        }

        const { error } = await adminClient
          .from("promptLibraryLayer")
          .upsert(
            {
              versionId,
              layerKey,
              content,
              sortOrder:
                STATIC_PROMPT_LAYER_ENTRIES.find((entry) => entry.layerKey === layerKey)?.sortOrder ??
                0,
            },
            { onConflict: "versionId,layerKey" },
          );
        if (error) throw error;
        clearPromptLibraryLayerCache();
        return json({ ok: true });
      }

      case "saveTestRun": {
        const versionId = body.versionId?.trim();
        if (!versionId) return json({ error: "versionId is required" }, 400);
        const flaggedCount =
          typeof body.flaggedCount === "number" && Number.isFinite(body.flaggedCount)
            ? Math.max(0, Math.floor(body.flaggedCount))
            : 0;

        const { data, error } = await adminClient
          .from("promptLibraryTestRun")
          .insert({
            versionId,
            adminUserId: auth.user.id,
            resultsJson: body.resultsJson ?? [],
            flaggedCount,
          })
          .select("id, versionId, runAt, flaggedCount")
          .single();
        if (error) throw error;
        return json({ ok: true, testRun: data });
      }

      case "approve": {
        const testRunId = body.testRunId?.trim();
        const versionId = body.versionId?.trim();
        if (!testRunId || !versionId) {
          return json({ error: "testRunId and versionId are required" }, 400);
        }

        const { data: testRun, error: testRunError } = await adminClient
          .from("promptLibraryTestRun")
          .select("id, versionId, flaggedCount")
          .eq("id", testRunId)
          .maybeSingle();
        if (testRunError) throw testRunError;
        if (!testRun || testRun.versionId !== versionId) {
          return json({ error: "Test run not found for version" }, 404);
        }

        const overrideReason = body.overrideReason?.trim() ?? null;
        if ((testRun.flaggedCount ?? 0) > 0 && !overrideReason) {
          return json({ error: "overrideReason required when flagged scenarios remain" }, 400);
        }

        const { error: approvalError } = await adminClient.from("promptLibraryApproval").insert({
          testRunId,
          versionId,
          approverUserId: auth.user.id,
          notes: body.notes?.trim() ?? null,
          overrideReason,
        });
        if (approvalError) throw approvalError;

        const { error: versionError } = await adminClient
          .from("promptLibraryVersion")
          .update({ status: "approved", approvedAt: new Date().toISOString() })
          .eq("id", versionId)
          .eq("status", "draft");
        if (versionError) throw versionError;

        return json({ ok: true });
      }

      case "promote": {
        const versionId = body.versionId?.trim();
        if (!versionId) return json({ error: "versionId is required" }, 400);

        const { data: approval, error: approvalError } = await adminClient
          .from("promptLibraryApproval")
          .select("id")
          .eq("versionId", versionId)
          .order("approvedAt", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (approvalError) throw approvalError;
        if (!approval) {
          return json({ error: "Promote blocked — version has no approval record" }, 400);
        }

        const { data: version, error: versionError } = await adminClient
          .from("promptLibraryVersion")
          .select("status")
          .eq("id", versionId)
          .maybeSingle();
        if (versionError) throw versionError;
        if (!version || (version.status !== "approved" && version.status !== "draft")) {
          return json({ error: "Only approved or draft versions can be promoted" }, 400);
        }

        const production = await fetchPromptLibraryVersionByStatus(adminClient, "production");
        if (production && production.id !== versionId) {
          await adminClient
            .from("promptLibraryVersion")
            .update({ status: "approved" })
            .eq("id", production.id)
            .eq("status", "production");
        }

        const { error: promoteError } = await adminClient
          .from("promptLibraryVersion")
          .update({
            status: "production",
            promotedAt: new Date().toISOString(),
          })
          .eq("id", versionId);
        if (promoteError) throw promoteError;

        clearPromptLibraryLayerCache();
        return json({ ok: true, productionVersionId: versionId });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prompt library action failed";
    return json({ error: message }, 500);
  }
});
