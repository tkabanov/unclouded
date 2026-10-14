import { callRpc } from "@/lib/supabase/rpc";

/**
 * NCLDD-56 — B2B partner portal data (`get_my_referral_partner_portal`). Only the signed-in
 * account's own partner; client names arrive masked. Earnings exist only under confirmed terms.
 */

export type PartnerTermsScope = "first_payment" | "months" | "lifetime";

export type PartnerTerms = {
  commissionPercent: number;
  scope: PartnerTermsScope;
  scopeMonths: number | null;
  effectiveFrom: string | null;
  confirmedAt: string | null;
};

/** "refunded": every payment of the client was fully refunded / disputed. */
export type PartnerClientStatus = "pending_confirmation" | "signed_up" | "paying" | "refunded";

export type MoneyAmount = { currency: string; cents: number };

export type PartnerClient = {
  displayName: string;
  joinedAt: string | null;
  status: PartnerClientStatus;
  payments: number;
  pendingTermsPayments: number;
  /** Net accrued commission, one entry per currency. */
  earned: MoneyAmount[];
};

export type PartnerPortal = {
  partner: { name: string; code: string; status: "active" | "inactive" };
  termsStatus: "confirmed" | "not_configured";
  terms: PartnerTerms | null;
  clients: PartnerClient[];
  totals: {
    /** Anonymous link visits (deduplicated per browser and day); not conversions. */
    linkVisits: number;
    signups: number;
    payingClients: number;
    payments: number;
    pendingTermsPayments: number;
    earned: MoneyAmount[];
  };
};

type Raw = Record<string, unknown>;

const SCOPES: readonly PartnerTermsScope[] = ["first_payment", "months", "lifetime"];
const CLIENT_STATUSES: readonly PartnerClientStatus[] = ["pending_confirmation", "signed_up", "paying", "refunded"];

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

function mapTerms(value: unknown): PartnerTerms | null {
  const row = asRecord(value);
  const scope = row?.scope as PartnerTermsScope;
  if (!row || !SCOPES.includes(scope)) return null;
  const percent = asNumber(row.commissionPercent);
  if (percent <= 0) return null;
  return {
    commissionPercent: percent,
    scope,
    scopeMonths: scope === "months" ? asNumber(row.scopeMonths) || null : null,
    effectiveFrom: asString(row.effectiveFrom),
    confirmedAt: asString(row.confirmedAt),
  };
}

function mapClient(value: unknown): PartnerClient | null {
  const row = asRecord(value);
  if (!row) return null;
  const status = row.status as PartnerClientStatus;
  return {
    displayName: asString(row.displayName) ?? "Client",
    joinedAt: asString(row.joinedAt),
    status: CLIENT_STATUSES.includes(status) ? status : "signed_up",
    payments: asNumber(row.payments),
    pendingTermsPayments: asNumber(row.pendingTermsPayments),
    earned: asArray(row.earned)
      .map(mapMoney)
      .filter((item): item is MoneyAmount => item !== null),
  };
}

function mapMoney(value: unknown): MoneyAmount | null {
  const row = asRecord(value);
  const currency = row ? asString(row.currency) : null;
  return row && currency ? { currency, cents: asNumber(row.cents) } : null;
}

/** Returns null when the payload is empty — the account is not a partner. */
export function mapPartnerPortal(value: unknown): PartnerPortal | null {
  const row = asRecord(value);
  const partner = row ? asRecord(row.partner) : null;
  const code = partner ? asString(partner.code) : null;
  if (!row || !partner || !code) return null;
  const totals = asRecord(row.totals) ?? {};
  const terms = mapTerms(row.terms);
  return {
    partner: {
      name: asString(partner.name) ?? "Partner",
      code,
      status: partner.status === "inactive" ? "inactive" : "active",
    },
    // Without parseable terms we never show earnings as confirmed.
    termsStatus: row.termsStatus === "confirmed" && terms ? "confirmed" : "not_configured",
    terms,
    clients: asArray(row.clients)
      .map(mapClient)
      .filter((item): item is PartnerClient => item !== null),
    totals: {
      linkVisits: asNumber(totals.linkVisits),
      signups: asNumber(totals.signups),
      payingClients: asNumber(totals.payingClients),
      payments: asNumber(totals.payments),
      pendingTermsPayments: asNumber(totals.pendingTermsPayments),
      earned: asArray(totals.earned)
        .map(mapMoney)
        .filter((item): item is MoneyAmount => item !== null),
    },
  };
}

export async function fetchMyPartnerPortal(): Promise<PartnerPortal | null> {
  const { data, error } = await callRpc("get_my_referral_partner_portal");
  if (error) throw new Error(error.message || "Couldn't load your partner portal.");
  return mapPartnerPortal(data);
}

/** Sidebar check; false on any error so the link simply stays hidden. */
export async function fetchIsReferralPartner(): Promise<boolean> {
  const { data, error } = await callRpc("is_my_referral_partner");
  return !error && data === true;
}
