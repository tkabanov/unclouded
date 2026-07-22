import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

/** Whitelisted profile columns for referral sign-up analytics (aggregated only). */
export const ADMIN_REFERRAL_SIGNUP_SELECT_COLUMNS =
  "referredByUserId, referredByReferralCode, createdAt, subscribed, tier" as const;

export const ADMIN_REFERRAL_SIGNUPS_HEADING = "Referral sign-ups" as const;

export const ADMIN_REFERRAL_SIGNUPS_EMPTY_TEXT = "No referral sign-ups yet." as const;

export const ADMIN_REFERRAL_SIGNUPS_SUBTITLE =
  "Aggregated sign-up and paid conversion counts per referrer, based on current subscribed/tier snapshot (no individual user data)." as const;

export type ReferralSignUpProfileRow = {
  referredByUserId: string | null;
  referredByReferralCode: string | null;
  createdAt: string;
  subscribed?: boolean | null;
  tier?: string | null;
};

export interface ReferralSignUpStat {
  referredByUserId: string | null;
  referralCode: string;
  signUpCount: number;
  paidConversionCount: number;
  conversionRate: number | null;
  lastSignUpAt: string;
}

export function isPaidReferralProfile(row: {
  subscribed?: boolean | null;
  tier?: string | null;
}): boolean {
  if (row.subscribed === true) return true;
  const tier = (row.tier ?? "").trim().toLowerCase();
  return tier !== "" && tier !== "free" && tier !== "explorer";
}

function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().toUpperCase();
}

function resolveReferralGroupKey(row: ReferralSignUpProfileRow): string | null {
  if (row.referredByUserId?.trim()) {
    return `user:${row.referredByUserId.trim()}`;
  }
  const code = normalizeReferralCode(row.referredByReferralCode);
  if (code) return `code:${code}`;
  return null;
}

function resolveReferralDisplayCode(
  row: ReferralSignUpProfileRow,
  fallbackCode: string | null,
): string {
  return normalizeReferralCode(row.referredByReferralCode) ?? fallbackCode ?? "—";
}

function compareIsoDatesDesc(a: string, b: string): number {
  const timeA = new Date(a).getTime();
  const timeB = new Date(b).getTime();
  if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
  if (Number.isNaN(timeA)) return 1;
  if (Number.isNaN(timeB)) return -1;
  return timeB - timeA;
}

export function aggregateReferralSignUpStats(
  rows: ReferralSignUpProfileRow[],
): ReferralSignUpStat[] {
  const byGroup = new Map<
    string,
    {
      referredByUserId: string | null;
      referralCode: string;
      signUpCount: number;
      paidConversionCount: number;
      lastSignUpAt: string;
    }
  >();

  for (const row of rows) {
    const groupKey = resolveReferralGroupKey(row);
    if (!groupKey) continue;

    const isPaid = isPaidReferralProfile(row);
    const existing = byGroup.get(groupKey);
    if (!existing) {
      byGroup.set(groupKey, {
        referredByUserId: row.referredByUserId?.trim() ?? null,
        referralCode: resolveReferralDisplayCode(row, null),
        signUpCount: 1,
        paidConversionCount: isPaid ? 1 : 0,
        lastSignUpAt: row.createdAt,
      });
      continue;
    }

    existing.signUpCount += 1;
    if (isPaid) existing.paidConversionCount += 1;
    if (compareIsoDatesDesc(existing.lastSignUpAt, row.createdAt) > 0) {
      existing.lastSignUpAt = row.createdAt;
    }
    if (existing.referralCode === "—") {
      existing.referralCode = resolveReferralDisplayCode(row, existing.referralCode);
    }
  }

  return [...byGroup.values()]
    .map((stats) => ({
      referredByUserId: stats.referredByUserId,
      referralCode: stats.referralCode,
      signUpCount: stats.signUpCount,
      paidConversionCount: stats.paidConversionCount,
      conversionRate:
        stats.signUpCount > 0 ? stats.paidConversionCount / stats.signUpCount : null,
      lastSignUpAt: stats.lastSignUpAt,
    }))
    .sort((a, b) => {
      if (b.signUpCount !== a.signUpCount) return b.signUpCount - a.signUpCount;
      return compareIsoDatesDesc(a.lastSignUpAt, b.lastSignUpAt);
    });
}

export function formatReferralSignUpDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function formatReferralConversionRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export async function fetchReferralSignUpStats(): Promise<ReferralSignUpStat[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(ADMIN_REFERRAL_SIGNUP_SELECT_COLUMNS)
    .not("referredByUserId", "is", null);

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  return aggregateReferralSignUpStats((data ?? []) as ReferralSignUpProfileRow[]);
}
