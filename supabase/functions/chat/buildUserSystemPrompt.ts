import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { buildSystemPrompt, type ProfileData } from "./buildSystemPrompt.ts";
import { loadServerProfile } from "./loadServerProfile.ts";
import { resolvePromptLibraryLayers } from "./prompt/loadPromptLibraryVersion.ts";
import type { PromptLibraryLayerMap } from "./prompt/promptLibraryStaticLayers.ts";
import { resolvePromptLibraryRequestOptions } from "./prompt/promptLibraryRequestOptions.ts";
import { buildRealtimeVoiceAddendum, type ChatSessionType } from "./prompt/realtimeVoicePrompts.ts";
import {
  buildSessionLifecycleInstruction,
  type ChatLifecycleMode,
} from "./prompt/sessionLifecycle.ts";
import { applySessionMemoryCompressionIfNeeded } from "./sessionMemory/sessionArcSummary.ts";
import {
  loadPlatformAiSettings,
  type PlatformAiSettings,
} from "../_shared/platformAiSettings.ts";

/**
 * NCLDD-57 S2: one prompt pipeline for chat (`chat/index.ts`) and realtime voice (`realtime-voice`).
 * Sequence: server profile + liveContext → Prompt Library layers + platform AI settings →
 * request live-context overrides → `buildSystemWithLifecycle`.
 */

type HeaderReader = { get(name: string): string | null };

export type UserPromptInputs = {
  profile: ProfileData;
  promptLayers: PromptLibraryLayerMap;
  platformSettings: PlatformAiSettings | null;
};

const BLOCK_SEPARATOR = "\n\n---\n\n";

/**
 * Coaching system prompt with the optional lifecycle instruction. The realtime addendum
 * (`voice_conversation` only) and the lifecycle instruction go before the platform rules
 * reminder + tone (NCLDD-53 BUG-1, OVR-070/071), so admin rules stay the last word.
 */
export function buildSystemWithLifecycle(
  profileData: ProfileData | undefined,
  context: string | undefined,
  lifecycle: ChatLifecycleMode | undefined,
  promptLayers?: PromptLibraryLayerMap,
  platformSettings?: PlatformAiSettings | null,
): string {
  const instruction = lifecycle
    ? buildSessionLifecycleInstruction(lifecycle, profileData ?? {}, context)
    : undefined;
  const addendum = buildRealtimeVoiceAddendum(profileData?.liveContext?.sessionType);
  const tail = [addendum, instruction].filter(Boolean).join(BLOCK_SEPARATOR) || undefined;
  return buildSystemPrompt(profileData, context, promptLayers, platformSettings, tail);
}

/**
 * Server profile, Prompt Library layers and platform AI settings for the authenticated user.
 * Prompt Library + platform settings are admin-only tables: read with the service client.
 * Draft slot / explicit version are honoured for admins only (`promptLibraryRequest`);
 * without it everyone gets the production version. Returns null when the profile is missing.
 */
export async function loadUserPromptInputs(params: {
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  userId: string;
  promptLibraryRequest?: {
    headers: HeaderReader;
    body: { promptLibraryVersionId?: string | null };
    envPreferDraft?: boolean;
  };
}): Promise<UserPromptInputs | null> {
  const profile = await loadServerProfile(params.userClient, params.userId);
  if (!profile) return null;

  const request = params.promptLibraryRequest;
  const promptLibraryOptions = request
    ? resolvePromptLibraryRequestOptions(
        profile,
        request.headers,
        request.body,
        request.envPreferDraft ?? false,
      )
    : { versionId: null, preferDraft: false };
  const [{ layers: promptLayers }, platformSettings] = await Promise.all([
    resolvePromptLibraryLayers(params.serviceClient, {
      ...promptLibraryOptions,
      // Lazy production seed runs under service role; only attribute it to admins.
      createdBy: profile.roleType === "admin" ? params.userId : null,
    }),
    loadPlatformAiSettings(params.serviceClient),
  ]);

  return { profile, promptLayers, platformSettings };
}

/** Session type, voice emotion and exchange count from the (validated) request. */
export function applyRequestLiveContext(
  profile: ProfileData,
  request: {
    sessionType?: ChatSessionType;
    voiceEmotionDetected?: boolean;
    exchangeCount: number;
  },
): void {
  if (!profile.liveContext) return;
  if (request.sessionType) {
    profile.liveContext.sessionType = request.sessionType;
  }
  profile.liveContext.voiceEmotionDetected = request.voiceEmotionDetected === true;
  profile.liveContext.exchangeCount = request.exchangeCount;
}

/**
 * Full system prompt for a session that is not driven by a chat request (realtime voice start).
 * Runs the same REQ-12 session-memory compression as chat. Returns null when the profile is
 * missing. Crisis, tier and budget gates stay with the caller.
 */
export async function buildUserSystemPrompt(params: {
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  userId: string;
  sessionType: ChatSessionType;
  lifecycle?: ChatLifecycleMode;
  context?: string;
  voiceEmotionDetected?: boolean;
  exchangeCount?: number;
  onArcSummaryUsage?: (model: string, usage: unknown) => void;
}): Promise<{ system: string; profile: ProfileData } | null> {
  const inputs = await loadUserPromptInputs(params);
  if (!inputs) return null;
  const { profile, promptLayers, platformSettings } = inputs;

  applyRequestLiveContext(profile, {
    sessionType: params.sessionType,
    voiceEmotionDetected: params.voiceEmotionDetected,
    exchangeCount: params.exchangeCount ?? 0,
  });

  const build = () =>
    buildSystemWithLifecycle(profile, params.context, params.lifecycle, promptLayers, platformSettings);
  let system = build();
  const compressed = await applySessionMemoryCompressionIfNeeded(
    params.userClient,
    params.userId,
    profile,
    system,
    params.onArcSummaryUsage,
  );
  if (compressed) system = build();

  return { system, profile };
}
