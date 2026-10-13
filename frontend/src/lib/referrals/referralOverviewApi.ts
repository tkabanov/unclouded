import { callRpc } from "@/lib/supabase/rpc";

/**
 * NCLDD-56 — the signed-in user's "Invite a friend" data (`get_my_referral_overview`).
 * Names arrive already masked (first name + last initial) from the database.
 */

export type ReferralInviteeStatus = "pending_confirmation" | "signed_up" | "rewarded";

export type ReferralInvitee = {
  displayName: string;
  joinedAt: string | null;
  status: ReferralInviteeStatus;
  rewardedAt: string | null;
};

export type ReferralCreditReason =
  | "referral_reward"
  | "redemption"
  | "cancel_refund"
  | "reversal"
  | "reversal_restore"
  | "admin_adjustment";

export type ReferralCreditHistoryItem = {
  id: string;
  reason: ReferralCreditReason;
  delta: number;
  createdAt: string | null;
  friendName: string | null;
  sessionAt: string | null;
};

export type ReferralCreditTotals = {
  earned: number;
  used: number;
  takenBack: number;
  adjusted: number;
  available: number;
};

export type ReferralOverview = {
  code: string | null;
  totalInvited: number;
  invitees: ReferralInvitee[];
  credits: ReferralCreditTotals;
  history: ReferralCreditHistoryItem[];
};

type Raw = Record<string, unknown>;

const INVITEE_STATUSES: readonly ReferralInviteeStatus[] = [
  "pending_confirmation",
  "signed_up",
  "rewarded",
];

const CREDIT_REASONS: readonly ReferralCreditReason[] = [
  "referral_reward",
  "redemption",
  "cancel_refund",
  "reversal",
  "reversal_restore",
  "admin_adjustment",
];

function asRecord(value: unknown): Raw | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapInvitee(value: unknown): ReferralInvitee | null {
  const row = asRecord(value);
  if (!row) return null;
  const status = row.status as ReferralInviteeStatus;
  return {
    displayName: asString(row.displayName) ?? "Friend",
    joinedAt: asString(row.joinedAt),
    status: INVITEE_STATUSES.includes(status) ? status : "signed_up",
    rewardedAt: asString(row.rewardedAt),
  };
}

function mapHistoryItem(value: unknown): ReferralCreditHistoryItem | null {
  const row = asRecord(value);
  const id = row ? asString(row.id) : null;
  const reason = row?.reason as ReferralCreditReason;
  if (!row || !id || !CREDIT_REASONS.includes(reason)) return null;
  return {
    id,
    reason,
    delta: asNumber(row.delta),
    createdAt: asString(row.createdAt),
    friendName: asString(row.friendName),
    sessionAt: asString(row.sessionAt),
  };
}

export function mapReferralOverview(value: unknown): ReferralOverview {
  const row = asRecord(value) ?? {};
  const credits = asRecord(row.credits) ?? {};
  return {
    code: asString(row.code)?.toUpperCase() ?? null,
    totalInvited: asNumber(row.totalInvited),
    invitees: asArray(row.invitees)
      .map(mapInvitee)
      .filter((item): item is ReferralInvitee => item !== null),
    credits: {
      earned: asNumber(credits.earned),
      used: asNumber(credits.used),
      takenBack: asNumber(credits.takenBack),
      adjusted: asNumber(credits.adjusted),
      available: asNumber(credits.available),
    },
    history: asArray(row.history)
      .map(mapHistoryItem)
      .filter((item): item is ReferralCreditHistoryItem => item !== null),
  };
}

export async function fetchMyReferralOverview(): Promise<ReferralOverview> {
  const { data, error } = await callRpc("get_my_referral_overview");
  if (error) throw new Error(error.message || "Couldn't load your referrals.");
  return mapReferralOverview(data);
}
