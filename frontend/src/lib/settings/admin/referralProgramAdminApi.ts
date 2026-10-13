import type { MoneyAmount, PartnerTerms, PartnerTermsScope } from "@/lib/referrals/partnerPortalApi";
import { callRpc } from "@/lib/supabase/rpc";

/**
 * NCLDD-56 — admin referral analytics: B2C stats per user, B2B partner comparison, partner
 * terms / account link / per-client commissions. All RPCs are settings-admin only.
 */

export type AdminUserReferralStats = {
  invites: { invited: number; registered: number; paidProPremium: number; movedToPartner: number };
  credits: { earned: number; used: number; takenBack: number; adjusted: number; available: number };
};

export type AdminPartnerMetrics = {
  partnerId: string;
  signups: number;
  confirmed: number;
  payingClients: number;
  payments: number;
  pendingTermsPayments: number;
  earned: MoneyAmount[];
  termsStatus: "confirmed" | "not_configured";
  terms: Omit<PartnerTerms, "confirmedAt"> | null;
  linkedEmail: string | null;
};

export type AdminPartnerTermsVersion = PartnerTerms & {
  id: string;
  status: "confirmed" | "archived";
  note: string | null;
  confirmedByEmail: string | null;
  archivedAt: string | null;
};

export type AdminPartnerClientCommission = {
  userId: string | null;
  name: string | null;
  email: string | null;
  payments: number;
  pendingTermsPayments: number;
  outOfScopePayments: number;
  earned: MoneyAmount[];
  lastPaidAt: string | null;
};

export type AdminPartnerProgram = {
  linkedAccount: { email: string; linkedAt: string | null } | null;
  terms: AdminPartnerTermsVersion[];
  clients: AdminPartnerClientCommission[];
};

export type ConfirmPartnerTermsInput = {
  partnerId: string;
  commissionPercent: number;
  scope: PartnerTermsScope;
  scopeMonths: number | null;
  effectiveFrom: string | null;
  note: string | null;
};

type Raw = Record<string, unknown>;

const SCOPES: readonly PartnerTermsScope[] = ["first_payment", "months", "lifetime"];

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

function mapMoneyList(value: unknown): MoneyAmount[] {
  return asArray(value)
    .map((item) => {
      const row = asRecord(item);
      const currency = row ? asString(row.currency) : null;
      return row && currency ? { currency, cents: asNumber(row.cents) } : null;
    })
    .filter((item): item is MoneyAmount => item !== null);
}

function mapScope(value: unknown): PartnerTermsScope | null {
  return SCOPES.includes(value as PartnerTermsScope) ? (value as PartnerTermsScope) : null;
}

function rpcError(error: { message: string } | null, fallback: string): Error | null {
  return error ? new Error(error.message || fallback) : null;
}

export function mapAdminUserReferralStats(value: unknown): AdminUserReferralStats {
  const row = asRecord(value) ?? {};
  const invites = asRecord(row.invites) ?? {};
  const credits = asRecord(row.credits) ?? {};
  return {
    invites: {
      invited: asNumber(invites.invited),
      registered: asNumber(invites.registered),
      paidProPremium: asNumber(invites.paidProPremium),
      movedToPartner: asNumber(invites.movedToPartner),
    },
    credits: {
      earned: asNumber(credits.earned),
      used: asNumber(credits.used),
      takenBack: asNumber(credits.takenBack),
      adjusted: asNumber(credits.adjusted),
      available: asNumber(credits.available),
    },
  };
}

export function mapAdminPartnerMetrics(value: unknown): AdminPartnerMetrics[] {
  return asArray(value)
    .map((item): AdminPartnerMetrics | null => {
      const row = asRecord(item);
      const partnerId = row ? asString(row.partnerId) : null;
      if (!row || !partnerId) return null;
      const terms = asRecord(row.terms);
      const scope = terms ? mapScope(terms.scope) : null;
      const parsedTerms =
        terms && scope && asNumber(terms.commissionPercent) > 0
          ? {
              commissionPercent: asNumber(terms.commissionPercent),
              scope,
              scopeMonths: scope === "months" ? asNumber(terms.scopeMonths) || null : null,
              effectiveFrom: asString(terms.effectiveFrom),
            }
          : null;
      return {
        partnerId,
        signups: asNumber(row.signups),
        confirmed: asNumber(row.confirmed),
        payingClients: asNumber(row.payingClients),
        payments: asNumber(row.payments),
        pendingTermsPayments: asNumber(row.pendingTermsPayments),
        earned: mapMoneyList(row.earned),
        termsStatus: row.termsStatus === "confirmed" && parsedTerms ? "confirmed" : "not_configured",
        terms: parsedTerms,
        linkedEmail: asString(row.linkedEmail),
      };
    })
    .filter((item): item is AdminPartnerMetrics => item !== null);
}

export function mapAdminPartnerProgram(value: unknown): AdminPartnerProgram | null {
  const row = asRecord(value);
  if (!row) return null;
  const linked = asRecord(row.linkedAccount);
  const linkedEmail = linked ? asString(linked.email) : null;
  return {
    linkedAccount: linked && linkedEmail ? { email: linkedEmail, linkedAt: asString(linked.linkedAt) } : null,
    terms: asArray(row.terms)
      .map((item): AdminPartnerTermsVersion | null => {
        const t = asRecord(item);
        const id = t ? asString(t.id) : null;
        const scope = t ? mapScope(t.scope) : null;
        if (!t || !id || !scope) return null;
        return {
          id,
          status: t.status === "confirmed" ? "confirmed" : "archived",
          commissionPercent: asNumber(t.commissionPercent),
          scope,
          scopeMonths: scope === "months" ? asNumber(t.scopeMonths) || null : null,
          effectiveFrom: asString(t.effectiveFrom),
          confirmedAt: asString(t.confirmedAt),
          note: asString(t.note),
          confirmedByEmail: asString(t.confirmedByEmail),
          archivedAt: asString(t.archivedAt),
        };
      })
      .filter((item): item is AdminPartnerTermsVersion => item !== null),
    clients: asArray(row.clients)
      .map((item): AdminPartnerClientCommission | null => {
        const c = asRecord(item);
        if (!c) return null;
        return {
          userId: asString(c.userId),
          name: asString(c.name),
          email: asString(c.email),
          payments: asNumber(c.payments),
          pendingTermsPayments: asNumber(c.pendingTermsPayments),
          outOfScopePayments: asNumber(c.outOfScopePayments),
          earned: mapMoneyList(c.earned),
          lastPaidAt: asString(c.lastPaidAt),
        };
      })
      .filter((item): item is AdminPartnerClientCommission => item !== null),
  };
}

export async function fetchAdminUserReferralStats(userId: string): Promise<AdminUserReferralStats> {
  const { data, error } = await callRpc("admin_get_user_referral_stats", { p_user_id: userId });
  const err = rpcError(error, "Couldn't load referral activity.");
  if (err) throw err;
  return mapAdminUserReferralStats(data);
}

export async function fetchAdminReferralPartnerMetrics(): Promise<AdminPartnerMetrics[]> {
  const { data, error } = await callRpc("admin_referral_partner_metrics");
  const err = rpcError(error, "Couldn't load partner metrics.");
  if (err) throw err;
  return mapAdminPartnerMetrics(data);
}

export async function fetchAdminReferralPartnerProgram(partnerId: string): Promise<AdminPartnerProgram | null> {
  const { data, error } = await callRpc("admin_get_referral_partner_program", { p_partner_id: partnerId });
  const err = rpcError(error, "Couldn't load partner commissions.");
  if (err) throw err;
  return mapAdminPartnerProgram(data);
}

export async function confirmAdminPartnerTerms(input: ConfirmPartnerTermsInput): Promise<void> {
  const { error } = await callRpc("admin_confirm_referral_partner_terms", {
    p_partner_id: input.partnerId,
    p_commission_percent: input.commissionPercent,
    p_scope: input.scope,
    p_scope_months: input.scope === "months" ? input.scopeMonths : null,
    p_effective_from: input.effectiveFrom,
    p_note: input.note,
  });
  const err = rpcError(error, "Couldn't save the terms.");
  if (err) throw err;
}

export async function archiveAdminPartnerTerms(partnerId: string): Promise<void> {
  const { error } = await callRpc("admin_archive_referral_partner_terms", { p_partner_id: partnerId });
  const err = rpcError(error, "Couldn't archive the terms.");
  if (err) throw err;
}

/** Link (email) or unlink (null) the partner's login account. Throws with the RPC's message. */
export async function linkAdminPartnerAccount(partnerId: string, email: string | null): Promise<void> {
  const { data, error } = await callRpc("admin_link_referral_partner_user", {
    p_partner_id: partnerId,
    p_email: email,
  });
  const err = rpcError(error, "Couldn't update the partner account.");
  if (err) throw err;
  const row = asRecord(data);
  if (row?.ok !== true) {
    throw new Error(asString(row?.error) ?? "Couldn't update the partner account.");
  }
}

/**
 * Validates the terms form from the raw input text (avoids float rounding and inputs such as
 * "0x10" that Number() would accept). Returns an error message or null.
 */
export function validatePartnerTermsInput(input: {
  commissionPercent: string;
  scope: PartnerTermsScope;
  scopeMonths: string;
}): string | null {
  const percentText = input.commissionPercent.trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(percentText)) {
    return "Enter the commission as a number with at most two decimals, e.g. 20 or 12.5.";
  }
  const percent = Number(percentText);
  if (percent <= 0 || percent > 100) {
    return "Commission must be more than 0% and at most 100%.";
  }
  if (input.scope === "months") {
    const monthsText = input.scopeMonths.trim();
    const months = Number(monthsText);
    if (!/^\d{1,3}$/.test(monthsText) || months < 1 || months > 120) {
      return "Months must be a whole number from 1 to 120.";
    }
  }
  return null;
}
