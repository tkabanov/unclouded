import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import {
  generateReferralCode,
  buildReferralShareUrl,
} from "@/lib/share/classificationShareCard";
import { normalizeInboundReferralCode } from "@/lib/share/referralAttribution";

export const REFERRAL_PARTNER_TYPES = [
  "coach",
  "therapist",
  "influencer",
  "other",
] as const;

export type ReferralPartnerType = (typeof REFERRAL_PARTNER_TYPES)[number];
export type ReferralPartnerStatus = "active" | "inactive";
export type ReferralPartnerStatusFilter = "all" | ReferralPartnerStatus;

export interface AdminReferralPartnerRecord {
  partnerId: string;
  name: string;
  type: ReferralPartnerType;
  email: string;
  contactInfo: string;
  status: ReferralPartnerStatus;
  referralCode: string;
  trackingUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminReferralPartnerFormState = {
  name: string;
  type: ReferralPartnerType;
  email: string;
  contactInfo: string;
  status: ReferralPartnerStatus;
  /** Empty on create → system generates. */
  referralCode: string;
};

type PartnerRow = {
  id?: string;
  name?: string;
  type?: string;
  email?: string;
  contactInfo?: string | null;
  status?: string | null;
  referralCode?: string;
  createdAt?: string;
  updatedAt?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
  rpc: typeof supabase.rpc;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asPartnerType(raw: string | undefined): ReferralPartnerType {
  if (raw && (REFERRAL_PARTNER_TYPES as readonly string[]).includes(raw)) {
    return raw as ReferralPartnerType;
  }
  return "other";
}

function asPartnerStatus(raw: string | null | undefined): ReferralPartnerStatus {
  return raw === "inactive" ? "inactive" : "active";
}

function toAdminPartner(row: PartnerRow): AdminReferralPartnerRecord | null {
  if (!row.id || !row.referralCode) return null;
  const name = row.name?.trim();
  const email = row.email?.trim();
  if (!name || !email) return null;
  const code = row.referralCode.trim().toUpperCase();
  return {
    partnerId: row.id,
    name,
    type: asPartnerType(row.type),
    email,
    contactInfo: row.contactInfo?.trim() ?? "",
    status: asPartnerStatus(row.status),
    referralCode: code,
    trackingUrl: buildReferralShareUrl(code),
    createdAt: row.createdAt ?? "",
    updatedAt: row.updatedAt ?? "",
  };
}

export function emptyReferralPartnerForm(): AdminReferralPartnerFormState {
  return {
    name: "",
    type: "coach",
    email: "",
    contactInfo: "",
    status: "active",
    referralCode: "",
  };
}

export function referralPartnerToForm(
  partner: AdminReferralPartnerRecord,
): AdminReferralPartnerFormState {
  return {
    name: partner.name,
    type: partner.type,
    email: partner.email,
    contactInfo: partner.contactInfo,
    status: partner.status,
    referralCode: partner.referralCode,
  };
}

export function partnerTypeLabel(type: ReferralPartnerType): string {
  switch (type) {
    case "coach":
      return "Coach";
    case "therapist":
      return "Therapist";
    case "influencer":
      return "Influencer";
    default:
      return "Other";
  }
}

function uniqueCodeError(error: { code?: string; message?: string }): Error {
  const message = error.message?.toLowerCase() ?? "";
  if (
    error.code === "23505" ||
    message.includes("referral_partner_code_unique") ||
    message.includes("collides with a user") ||
    message.includes("duplicate key")
  ) {
    return new Error("This referral code is already in use.");
  }
  return new Error(error.message || "Couldn't save referral partner.");
}

async function assertCodeAvailable(
  code: string,
  excludePartnerId?: string,
): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;

  let partnerQuery = client
    .from("referralPartner")
    .select("id")
    .eq("referralCode", code)
    .limit(1);
  if (excludePartnerId) {
    partnerQuery = partnerQuery.neq("id", excludePartnerId);
  }
  const { data: partnerHit, error: partnerErr } = await partnerQuery.maybeSingle();
  if (partnerErr && !isSchemaUnavailable(partnerErr)) throw partnerErr;
  if (partnerHit) throw new Error("This referral code is already in use.");

  const { data: userHit, error: userErr } = await client
    .from("profiles")
    .select("id")
    .eq("referralCode", code)
    .limit(1)
    .maybeSingle();
  if (userErr && !isSchemaUnavailable(userErr)) throw userErr;
  if (userHit) throw new Error("This referral code is already in use.");
}

async function allocateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = generateReferralCode();
    try {
      await assertCodeAvailable(candidate);
      return candidate;
    } catch {
      // retry
    }
  }
  throw new Error("Couldn't generate a unique referral code.");
}

function validateForm(form: AdminReferralPartnerFormState): {
  name: string;
  type: ReferralPartnerType;
  email: string;
  contactInfo: string;
  status: ReferralPartnerStatus;
  referralCode: string | null;
} {
  const name = form.name.trim();
  const email = normalizeEmail(form.email);
  if (!name) throw new Error("Partner name is required.");
  if (!email) throw new Error("Email is required.");
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");

  const rawCode = form.referralCode.trim();
  let referralCode: string | null = null;
  if (rawCode) {
    referralCode = normalizeInboundReferralCode(rawCode);
    if (!referralCode) {
      throw new Error("Referral code must be 4–16 characters (A–Z, 2–9).");
    }
  }

  return {
    name,
    type: form.type,
    email,
    contactInfo: form.contactInfo.trim(),
    status: form.status,
    referralCode,
  };
}

export async function fetchAdminReferralPartners(
  statusFilter: ReferralPartnerStatusFilter = "all",
): Promise<AdminReferralPartnerRecord[]> {
  const client = supabase as unknown as UntypedSupabase;
  let query = client
    .from("referralPartner")
    .select("id, name, type, email, contactInfo, status, referralCode, createdAt, updatedAt")
    .order("name", { ascending: true });

  if (statusFilter === "active" || statusFilter === "inactive") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminPartner(row as PartnerRow))
    .filter((item): item is AdminReferralPartnerRecord => item !== null);
}

export async function fetchAdminReferralPartner(
  partnerId: string,
): Promise<AdminReferralPartnerRecord | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("referralPartner")
    .select("id, name, type, email, contactInfo, status, referralCode, createdAt, updatedAt")
    .eq("id", partnerId)
    .maybeSingle();
  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }
  return toAdminPartner((data ?? {}) as PartnerRow);
}

export async function createAdminReferralPartner(
  form: AdminReferralPartnerFormState,
): Promise<AdminReferralPartnerRecord> {
  const validated = validateForm(form);
  const code = validated.referralCode ?? (await allocateUniqueCode());
  await assertCodeAvailable(code);

  const id = crypto.randomUUID();
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("referralPartner")
    .insert({
      id,
      name: validated.name,
      type: validated.type,
      email: validated.email,
      contactInfo: validated.contactInfo || null,
      status: validated.status,
      referralCode: code,
    } as never)
    .select("id, name, type, email, contactInfo, status, referralCode, createdAt, updatedAt")
    .single();

  if (error) throw uniqueCodeError(error);
  const created = toAdminPartner((data ?? {}) as PartnerRow);
  if (!created) throw new Error("Failed to create referral partner.");
  return created;
}

export async function updateAdminReferralPartner(
  partnerId: string,
  form: AdminReferralPartnerFormState,
): Promise<void> {
  const validated = validateForm(form);
  if (!validated.referralCode) {
    throw new Error("Referral code is required.");
  }
  await assertCodeAvailable(validated.referralCode, partnerId);

  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("referralPartner")
    .update({
      name: validated.name,
      type: validated.type,
      email: validated.email,
      contactInfo: validated.contactInfo || null,
      status: validated.status,
      referralCode: validated.referralCode,
    } as never)
    .eq("id", partnerId);

  if (error) throw uniqueCodeError(error);
}

export async function setReferralPartnerStatus(
  partnerId: string,
  status: ReferralPartnerStatus,
): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("referralPartner")
    .update({ status } as never)
    .eq("id", partnerId);
  if (error) throw error;
}

export async function adminSetUserReferralPartner(
  userId: string,
  partnerId: string | null,
): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client.rpc("admin_set_user_referral_partner", {
    p_user_id: userId,
    p_partner_id: partnerId,
  } as never);
  if (error) throw new Error(error.message || "Couldn't update referral attribution.");
}

export type UserReferralAttribution = {
  referralPartnerId: string | null;
  referralPartnerCode: string | null;
  referredAt: string | null;
  referralFirstPaidAt: string | null;
  partnerName: string | null;
  referredByUserId: string | null;
  referredByReferralCode: string | null;
};

export async function fetchUserReferralAttribution(
  userId: string,
): Promise<UserReferralAttribution | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("profiles")
    .select(
      "referralPartnerId, referralPartnerCode, referredAt, referralFirstPaidAt, referredByUserId, referredByReferralCode",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }
  if (!data) return null;

  const row = data as {
    referralPartnerId?: string | null;
    referralPartnerCode?: string | null;
    referredAt?: string | null;
    referralFirstPaidAt?: string | null;
    referredByUserId?: string | null;
    referredByReferralCode?: string | null;
  };

  let partnerName: string | null = null;
  if (row.referralPartnerId) {
    const partner = await fetchAdminReferralPartner(row.referralPartnerId);
    partnerName = partner?.name ?? null;
  }

  return {
    referralPartnerId: row.referralPartnerId ?? null,
    referralPartnerCode: row.referralPartnerCode ?? null,
    referredAt: row.referredAt ?? null,
    referralFirstPaidAt: row.referralFirstPaidAt ?? null,
    partnerName,
    referredByUserId: row.referredByUserId ?? null,
    referredByReferralCode: row.referredByReferralCode ?? null,
  };
}
