import { supabase } from "@/integrations/supabase/client";
import { friendlyErrorMessage } from "@/lib/settings/admin/adminAiSettingsApi";

/** NCLDD-52 — admin AI Usage RPCs. Costs are estimates (tokens/seconds/chars x price table). */

export type AiMode = "text" | "voice";
export type AiPlanTier = "free" | "pro" | "premium";
export type AiLimitSource = "plan" | "custom" | "unlimited" | "unset";
export type AiUserLimitKind = "plan" | "custom" | "unlimited";

export const AI_PLAN_TIERS: readonly AiPlanTier[] = ["free", "pro", "premium"];
export const AI_MODES: readonly AiMode[] = ["text", "voice"];

/** Basic = Free (OVR-072). */
export const AI_TIER_LABELS: Record<AiPlanTier, string> = {
  free: "Basic (Free)",
  pro: "Pro",
  premium: "Premium",
};

type Raw = Record<string, unknown>;

function rec(value: unknown): Raw {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};
}
function arr(value: unknown): Raw[] {
  return Array.isArray(value) ? value.map(rec) : [];
}
function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}
function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function tier(value: unknown): AiPlanTier {
  return value === "pro" || value === "premium" ? value : "free";
}

const ERRORS = {
  overview: "Couldn't load AI usage.",
  limits: "Couldn't load AI limits.",
  users: "Couldn't load AI usage by user.",
  detail: "Couldn't load this user's AI limits.",
  audit: "Couldn't load the AI limit history.",
  save: "Couldn't save the change.",
} as const;

async function callRpc(name: string, args: Raw, fallback: string): Promise<Raw> {
  // Cast: argument shapes are fixed by the typed wrappers below.
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw new Error(friendlyErrorMessage(error.message, fallback));
  const result = rec(data);
  if (result.ok === false) {
    throw new Error(friendlyErrorMessage(str(result.error), fallback));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export type AiUsageKpis = {
  sessions: number;
  activeUsers: number;
  spendUsd: number;
  avgCostPerSessionUsd: number;
};

export type AiUsageOverview = {
  dataSince: string | null;
  kpis: AiUsageKpis & { prior: AiUsageKpis };
  daily: Array<{ date: string; sessions: number; spendUsd: number }>;
  byMode: Array<{ mode: "text" | "voice" | "other"; sessions: number; spendUsd: number }>;
  byPlan: Array<{ tier: AiPlanTier; sessions: number; spendUsd: number }>;
  byModel: Array<{
    provider: string;
    model: string;
    sessions: number;
    spendUsd: number;
    costPerSessionUsd: number;
    pricingMissing: boolean;
  }>;
  topUsers: Array<{
    userId: string;
    displayName: string;
    sessions: number;
    spendUsd: number;
    currentTier: AiPlanTier;
  }>;
  avgDurationSeconds: { text: number | null; voice: number | null };
};

function kpis(raw: unknown): AiUsageKpis {
  const r = rec(raw);
  return {
    sessions: num(r.sessions),
    activeUsers: num(r.activeUsers),
    spendUsd: num(r.spendUsd),
    avgCostPerSessionUsd: num(r.avgCostPerSessionUsd),
  };
}

export function mapAiUsageOverview(raw: unknown): AiUsageOverview {
  const r = rec(raw);
  const k = rec(r.kpis);
  const dur = rec(r.avgDurationSeconds);
  return {
    dataSince: strOrNull(r.dataSince),
    kpis: { ...kpis(k), prior: kpis(k.prior) },
    daily: arr(r.daily).map((d) => ({
      date: str(d.date),
      sessions: num(d.sessions),
      spendUsd: num(d.spendUsd),
    })),
    byMode: arr(r.byMode).map((m) => ({
      mode: m.mode === "voice" || m.mode === "other" ? m.mode : "text",
      sessions: num(m.sessions),
      spendUsd: num(m.spendUsd),
    })),
    byPlan: arr(r.byPlan).map((p) => ({
      tier: tier(p.tier),
      sessions: num(p.sessions),
      spendUsd: num(p.spendUsd),
    })),
    byModel: arr(r.byModel).map((m) => ({
      provider: str(m.provider),
      model: str(m.model),
      sessions: num(m.sessions),
      spendUsd: num(m.spendUsd),
      costPerSessionUsd: num(m.costPerSessionUsd),
      pricingMissing: m.pricingMissing === true,
    })),
    topUsers: arr(r.topUsers).map((u) => ({
      userId: str(u.userId),
      displayName: str(u.displayName),
      sessions: num(u.sessions),
      spendUsd: num(u.spendUsd),
      currentTier: tier(u.currentTier),
    })),
    avgDurationSeconds: { text: numOrNull(dur.text), voice: numOrNull(dur.voice) },
  };
}

export async function fetchAiUsageOverview(params: {
  from: string;
  to: string;
  tier?: AiPlanTier | null;
}): Promise<AiUsageOverview> {
  const result = await callRpc(
    "admin_ai_usage_overview",
    { p_from: params.from, p_to: params.to, p_tier: params.tier ?? null },
    ERRORS.overview,
  );
  return mapAiUsageOverview(result);
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export type AiPlanLimit = {
  planTier: AiPlanTier;
  mode: AiMode;
  monthlyUsd: number | null;
  updatedAt: string | null;
  updatedByName: string | null;
};

export async function fetchAiPlanLimits(): Promise<AiPlanLimit[]> {
  const result = await callRpc("admin_ai_plan_limits", {}, ERRORS.limits);
  return arr(result.limits).map((l) => ({
    planTier: tier(l.planTier),
    mode: l.mode === "voice" ? "voice" : "text",
    monthlyUsd: numOrNull(l.monthlyUsd),
    updatedAt: strOrNull(l.updatedAt),
    updatedByName: strOrNull(l.updatedByName),
  }));
}

export type AiMutationResult = {
  ok: boolean;
  /** `updated` | `restored` | `no_change` | validation codes. */
  code: string;
  error: string | null;
};

function mutationResult(raw: unknown): AiMutationResult {
  const r = rec(raw);
  return { ok: r.ok === true, code: str(r.code), error: strOrNull(r.error) };
}

async function callMutation(name: string, args: Raw): Promise<AiMutationResult> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw new Error(friendlyErrorMessage(error.message, ERRORS.save));
  return mutationResult(data);
}

export function saveAiPlanLimit(
  planTier: AiPlanTier,
  mode: AiMode,
  amount: number | null,
): Promise<AiMutationResult> {
  return callMutation("admin_set_ai_plan_limit", {
    p_tier: planTier,
    p_mode: mode,
    p_amount: amount,
  });
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type AiEffectiveLimit = {
  mode: AiMode;
  tier: AiPlanTier;
  source: AiLimitSource;
  limitUsd: number | null;
  monthSpendUsd: number;
  baselineUsd: number;
  usedUsd: number;
  remainingUsd: number | null;
  exceeded: boolean;
};

function effectiveLimit(raw: unknown, fallbackMode: AiMode): AiEffectiveLimit {
  const r = rec(raw);
  const source = r.source;
  return {
    mode: r.mode === "voice" ? "voice" : r.mode === "text" ? "text" : fallbackMode,
    tier: tier(r.tier),
    source: source === "custom" || source === "unlimited" || source === "plan" ? source : "unset",
    limitUsd: numOrNull(r.limitUsd),
    monthSpendUsd: num(r.monthSpendUsd),
    baselineUsd: num(r.baselineUsd),
    usedUsd: num(r.usedUsd),
    remainingUsd: numOrNull(r.remainingUsd),
    exceeded: r.exceeded === true,
  };
}

export type AiUsageUserRow = {
  userId: string;
  displayName: string;
  email: string | null;
  tier: AiPlanTier;
  sessions: number;
  spendUsd: number;
  text: AiEffectiveLimit;
  voice: AiEffectiveLimit;
};

export type AiUsageUsersPage = { total: number; monthKey: string; rows: AiUsageUserRow[] };

export type AiUsageUsersQuery = {
  search?: string;
  tier?: AiPlanTier | null;
  status?: "ok" | "exceeded" | null;
  limit?: number;
  offset?: number;
};

export async function fetchAiUsageUsers(query: AiUsageUsersQuery): Promise<AiUsageUsersPage> {
  const result = await callRpc(
    "admin_ai_usage_users",
    {
      p_search: query.search?.trim() || null,
      p_tier: query.tier ?? null,
      p_status: query.status ?? null,
      p_limit: query.limit ?? 25,
      p_offset: query.offset ?? 0,
    },
    ERRORS.users,
  );
  return {
    total: num(result.total),
    monthKey: str(result.monthKey),
    rows: arr(result.rows).map((row) => ({
      userId: str(row.userId),
      displayName: str(row.displayName),
      email: strOrNull(row.email),
      tier: tier(row.tier),
      sessions: num(row.sessions),
      spendUsd: num(row.spendUsd),
      text: effectiveLimit(row.text, "text"),
      voice: effectiveLimit(row.voice, "voice"),
    })),
  };
}

export type AiUserLimitDetail = {
  monthKey: string;
  user: { userId: string; displayName: string; email: string | null; tier: AiPlanTier };
  text: AiEffectiveLimit;
  voice: AiEffectiveLimit;
  /** Stored per-user overrides (what the dialog edits); absent mode = plan default. */
  overrides: Array<{ mode: AiMode; kind: "custom" | "unlimited"; monthlyUsd: number | null }>;
};

export async function fetchAiUserLimitDetail(userId: string): Promise<AiUserLimitDetail> {
  const result = await callRpc("admin_ai_user_limit_detail", { p_user: userId }, ERRORS.detail);
  const u = rec(result.user);
  return {
    monthKey: str(result.monthKey),
    user: {
      userId: str(u.userId),
      displayName: str(u.displayName),
      email: strOrNull(u.email),
      tier: tier(u.tier),
    },
    text: effectiveLimit(result.text, "text"),
    voice: effectiveLimit(result.voice, "voice"),
    overrides: arr(result.overrides).map((o) => ({
      mode: o.mode === "voice" ? "voice" : "text",
      kind: o.kind === "unlimited" ? "unlimited" : "custom",
      monthlyUsd: numOrNull(o.monthlyUsd),
    })),
  };
}

export function setAiUserLimit(
  userId: string,
  mode: AiMode,
  kind: AiUserLimitKind,
  amount: number | null,
): Promise<AiMutationResult> {
  return callMutation("admin_set_ai_user_limit", {
    p_user: userId,
    p_mode: mode,
    p_kind: kind,
    p_amount: kind === "custom" ? amount : null,
  });
}

export function restoreAiUserLimit(userId: string, mode: AiMode): Promise<AiMutationResult> {
  return callMutation("admin_restore_ai_user_limit", { p_user: userId, p_mode: mode });
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type AiLimitAuditAction =
  | "plan_limit_set"
  | "user_override_set"
  | "user_unlimited_set"
  | "user_override_cleared"
  | "user_limit_restored";

export type AiLimitAuditRow = {
  id: string;
  createdAt: string;
  action: AiLimitAuditAction;
  actorName: string | null;
  targetName: string | null;
  planTier: string | null;
  mode: AiMode;
  oldValue: Raw;
  newValue: Raw;
};

export async function fetchAiLimitAudit(params: {
  limit?: number;
  offset?: number;
  userId?: string | null;
}): Promise<{ total: number; rows: AiLimitAuditRow[] }> {
  const result = await callRpc(
    "admin_ai_limit_audit",
    { p_limit: params.limit ?? 25, p_offset: params.offset ?? 0, p_user: params.userId ?? null },
    ERRORS.audit,
  );
  return {
    total: num(result.total),
    rows: arr(result.rows).map((row) => ({
      id: str(row.id),
      createdAt: str(row.createdAt),
      action: str(row.action) as AiLimitAuditAction,
      actorName: strOrNull(row.actorName),
      targetName: strOrNull(row.targetName),
      planTier: strOrNull(row.planTier),
      mode: row.mode === "voice" ? "voice" : "text",
      oldValue: rec(row.oldValue),
      newValue: rec(row.newValue),
    })),
  };
}

/** Human-readable old/new value for the audit table. */
export function describeAuditValue(action: AiLimitAuditAction, value: Raw): string {
  const money = (v: unknown) => (v == null ? "not set" : `$${num(v).toFixed(2)}`);
  switch (action) {
    case "plan_limit_set":
      return money(value.monthlyUsd);
    case "user_limit_restored":
      return `used ${money(value.usedUsd)}`;
    default: {
      const kind = value.kind;
      if (kind === "unlimited") return "Unlimited";
      if (kind === "custom") return `Custom ${money(value.monthlyUsd)}`;
      return "Plan default";
    }
  }
}
