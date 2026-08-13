import { supabase } from "@/integrations/supabase/client";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import { isValidUuid } from "@/lib/uuid/isValidUuid";
import { createWorkplaceEnrollmentCode } from "@/lib/workplace/workplaceEnrollmentApi";

export const ADMIN_WORKPLACES_ONBOARDING_KEY = "admin_workplaces" as const;

export { isValidUuid };

export type ContractTier = "pro" | "premium";

export type BillingPeriod = "monthly" | "quarterly" | "half_yearly" | "yearly";

export type BillingModel = "flat_rate" | "pay_per_active";

export type PaymentMethod = "manual_invoice" | "stripe";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
};

export const BILLING_MODEL_LABELS: Record<BillingModel, string> = {
  flat_rate: "Flat rate (fixed seats)",
  pay_per_active: "Pay per active user",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  manual_invoice: "Manual invoice",
  stripe: "Stripe (metadata)",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

const WORKPLACE_SELECT =
  "id, name, contactEmail, contractTier, seatCount, contractStartDate, contractEndDate, isActive, billingPeriod, price, billingModel, paymentMethod, billingNotes, maxSeats, invoiceStatus";

export interface AdminWorkplaceRecord {
  workplaceId: string;
  name: string;
  contactEmail: string;
  contractTier: ContractTier;
  seatCount: number;
  contractStartDate: string | null;
  contractEndDate: string | null;
  isActive: boolean;
  billingPeriod: BillingPeriod | null;
  price: number | null;
  billingModel: BillingModel;
  paymentMethod: PaymentMethod;
  billingNotes: string | null;
  maxSeats: number | null;
  invoiceStatus: InvoiceStatus;
  activeSeats?: number;
  periodActiveUsers?: number;
  /** False for legacy onboarding-only rows with non-UUID ids — metrics need the DB table. */
  metricsReady: boolean;
}

export type AdminWorkplaceFormState = {
  name: string;
  contactEmail: string;
  contractTier: ContractTier;
  seatCount: number;
  contractStartDate: string;
  contractEndDate: string;
  isActive: boolean;
  billingPeriod: BillingPeriod | "";
  price: string;
  billingModel: BillingModel;
  paymentMethod: PaymentMethod;
  billingNotes: string;
  maxSeats: string;
  invoiceStatus: InvoiceStatus;
};

type WorkplaceRow = {
  id?: string;
  name?: string;
  contactEmail?: string;
  contractTier?: string;
  seatCount?: number;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  isActive?: boolean;
  billingPeriod?: string | null;
  price?: number | string | null;
  billingModel?: string | null;
  paymentMethod?: string | null;
  billingNotes?: string | null;
  maxSeats?: number | null;
  invoiceStatus?: string | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type AdminWorkplacesLoadResult = {
  workplaces: AdminWorkplaceRecord[];
  dataSource: AdminDataSource;
};

function normalizeContractTier(value: string | null | undefined): ContractTier {
  return value?.trim().toLowerCase() === "premium" ? "premium" : "pro";
}

function normalizeBillingPeriod(value: string | null | undefined): BillingPeriod | null {
  const v = value?.trim().toLowerCase();
  if (v === "monthly" || v === "quarterly" || v === "half_yearly" || v === "yearly") {
    return v;
  }
  return null;
}

function normalizeBillingModel(value: string | null | undefined): BillingModel {
  return value?.trim().toLowerCase() === "pay_per_active" ? "pay_per_active" : "flat_rate";
}

function normalizePaymentMethod(value: string | null | undefined): PaymentMethod {
  return value?.trim().toLowerCase() === "stripe" ? "stripe" : "manual_invoice";
}

function normalizeInvoiceStatus(value: string | null | undefined): InvoiceStatus {
  const v = value?.trim().toLowerCase();
  if (v === "sent" || v === "paid" || v === "overdue") return v;
  return "draft";
}

function normalizePrice(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function toAdminWorkplace(row: WorkplaceRow, metricsReady: boolean): AdminWorkplaceRecord | null {
  const name = row.name?.trim();
  const contactEmail = row.contactEmail?.trim();
  const workplaceId = row.id?.trim();
  if (!name || !contactEmail || !workplaceId) return null;

  return {
    workplaceId,
    name,
    contactEmail,
    contractTier: normalizeContractTier(row.contractTier),
    seatCount: typeof row.seatCount === "number" && row.seatCount > 0 ? row.seatCount : 50,
    contractStartDate: row.contractStartDate ?? null,
    contractEndDate: row.contractEndDate ?? null,
    isActive: row.isActive !== false,
    billingPeriod: normalizeBillingPeriod(row.billingPeriod),
    price: normalizePrice(row.price),
    billingModel: normalizeBillingModel(row.billingModel),
    paymentMethod: normalizePaymentMethod(row.paymentMethod),
    billingNotes: row.billingNotes?.trim() || null,
    maxSeats: typeof row.maxSeats === "number" && row.maxSeats > 0 ? row.maxSeats : null,
    invoiceStatus: normalizeInvoiceStatus(row.invoiceStatus),
    metricsReady: metricsReady && isValidUuid(workplaceId),
  };
}

async function readOnboardingWorkplaces(userId: string): Promise<AdminWorkplaceRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};
  const raw = onboarding[ADMIN_WORKPLACES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) =>
      entry && typeof entry === "object"
        ? toAdminWorkplace(entry as WorkplaceRow, false)
        : null,
    )
    .filter((item): item is AdminWorkplaceRecord => item !== null);
}

async function writeOnboardingWorkplaces(userId: string, rows: WorkplaceRow[]): Promise<void> {
  const { data, error: readError } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...onboarding,
        [ADMIN_WORKPLACES_ONBOARDING_KEY]: rows,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function attachActiveSeats(
  workplaces: AdminWorkplaceRecord[],
): Promise<AdminWorkplaceRecord[]> {
  return Promise.all(
    workplaces.map(async (workplace) => {
      if (!workplace.metricsReady) return workplace;
      try {
        const [activeSeats, periodActiveUsers] = await Promise.all([
          fetchAdminWorkplaceActiveSeats(workplace.workplaceId),
          workplace.billingModel === "pay_per_active"
            ? fetchAdminWorkplacePeriodActiveUsers(workplace.workplaceId)
            : Promise.resolve(undefined),
        ]);
        return { ...workplace, activeSeats, periodActiveUsers };
      } catch {
        return workplace;
      }
    }),
  );
}

async function tryFetchWorkplacesFromTable(): Promise<AdminWorkplaceRecord[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client.from("workplace").select(WORKPLACE_SELECT);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminWorkplace(row as WorkplaceRow, true))
    .filter((item): item is AdminWorkplaceRecord => item !== null);
}

export async function fetchAdminWorkplaces(userId: string): Promise<AdminWorkplacesLoadResult> {
  const fromTable = await tryFetchWorkplacesFromTable();
  if (fromTable !== null) {
    return {
      workplaces: await attachActiveSeats(fromTable),
      dataSource: "table",
    };
  }

  const workplaces = await readOnboardingWorkplaces(userId);
  return {
    workplaces,
    dataSource: workplaces.length > 0 ? "onboarding" : "static",
  };
}

export async function fetchAdminWorkplace(
  userId: string,
  workplaceId: string,
): Promise<AdminWorkplaceRecord | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("workplace")
    .select(WORKPLACE_SELECT)
    .eq("id", workplaceId)
    .maybeSingle();

  if (!error && data) {
    const workplace = toAdminWorkplace(data as WorkplaceRow, true);
    if (!workplace) return null;
    const [withSeats] = await attachActiveSeats([workplace]);
    return withSeats;
  }

  if (error && !isSchemaUnavailable(error)) throw error;

  const fromOnboarding = await readOnboardingWorkplaces(userId);
  return fromOnboarding.find((w) => w.workplaceId === workplaceId) ?? null;
}

function parseFormPrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    throw new Error("Enter a valid price.");
  }
  if (n < 0) {
    throw new Error("Price cannot be negative.");
  }
  return n;
}

function parseOptionalMaxSeats(value: string, billingModel: BillingModel): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    throw new Error("Max seats must be a whole number ≥ 1.");
  }
  if (billingModel !== "pay_per_active") return null;
  return n;
}

function validateWorkplaceForm(form: AdminWorkplaceFormState): void {
  if (!form.name.trim()) throw new Error("Organization name is required.");
  if (!form.contactEmail.trim()) throw new Error("HR contact email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
    throw new Error("Enter a valid HR contact email.");
  }
  if (!Number.isFinite(form.seatCount) || form.seatCount <= 0) {
    throw new Error("Seat count must be at least 1.");
  }
  if (!form.billingPeriod) {
    throw new Error("Payment term is required.");
  }
  if (!form.contractStartDate.trim()) {
    throw new Error("Contract start date is required.");
  }
  if (!form.contractEndDate.trim()) {
    throw new Error("Contract end date is required.");
  }
  if (form.contractEndDate < form.contractStartDate) {
    throw new Error("Contract end date must be on or after the start date.");
  }
  parseFormPrice(form.price);
  parseOptionalMaxSeats(form.maxSeats, form.billingModel);
}

function normalizeOptionalDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function workplaceInsertPayload(form: AdminWorkplaceFormState): Record<string, unknown> {
  return {
    name: form.name.trim(),
    contactEmail: form.contactEmail.trim(),
    contractTier: form.contractTier,
    seatCount: form.seatCount,
    contractStartDate: normalizeOptionalDate(form.contractStartDate),
    contractEndDate: normalizeOptionalDate(form.contractEndDate),
    isActive: form.isActive,
    billingPeriod: form.billingPeriod || null,
    price: parseFormPrice(form.price),
    billingModel: form.billingModel,
    paymentMethod: form.paymentMethod,
    billingNotes: form.billingNotes.trim() || null,
    maxSeats: parseOptionalMaxSeats(form.maxSeats, form.billingModel),
    invoiceStatus: form.invoiceStatus,
  };
}

async function softWarnDuplicateName(name: string, excludeId?: string): Promise<string | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client.from("workplace").select("id, name");
  if (error || !Array.isArray(data)) return null;
  const needle = name.trim().toLowerCase();
  const clash = data.find((row) => {
    const record = row as { id?: string; name?: string };
    if (excludeId && record.id === excludeId) return false;
    return (record.name ?? "").trim().toLowerCase() === needle;
  });
  return clash ? "An organization with this name already exists." : null;
}

export type CreateAdminWorkplaceResult = {
  workplace: AdminWorkplaceRecord;
  /** Set when auto-mint failed after retry; org still exists. */
  mintError: string | null;
  /** Soft uniqueness: same display name already exists. */
  duplicateName: boolean;
};

async function mintEnrollmentCodeWithRetry(workplaceId: string): Promise<string | null> {
  try {
    await createWorkplaceEnrollmentCode(workplaceId);
    return null;
  } catch (firstErr) {
    try {
      await createWorkplaceEnrollmentCode(workplaceId);
      return null;
    } catch (retryErr) {
      const message =
        retryErr instanceof Error
          ? retryErr.message
          : firstErr instanceof Error
            ? firstErr.message
            : "Couldn't create enrollment code.";
      return message;
    }
  }
}

export async function createAdminWorkplace(
  userId: string,
  form: AdminWorkplaceFormState,
): Promise<CreateAdminWorkplaceResult> {
  validateWorkplaceForm(form);

  const duplicateName = Boolean(await softWarnDuplicateName(form.name));
  void userId;

  const client = supabase as unknown as UntypedSupabase;
  const { data: inserted, error: tableError } = await client
    .from("workplace")
    .insert(workplaceInsertPayload(form) as never)
    .select(WORKPLACE_SELECT)
    .maybeSingle();

  if (!tableError && inserted) {
    const created = toAdminWorkplace(inserted as WorkplaceRow, true);
    if (!created) throw new Error("Failed to create organization.");
    const mintError = await mintEnrollmentCodeWithRetry(created.workplaceId);
    return { workplace: created, mintError, duplicateName };
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const row: WorkplaceRow = {
    id: crypto.randomUUID(),
    ...workplaceInsertPayload(form),
  } as WorkplaceRow;
  row.id = row.id ?? crypto.randomUUID();

  const existing = await readOnboardingWorkplaces(userId);
  const stored = existing.map((workplace) => workplaceRowFromRecord(workplace));

  await writeOnboardingWorkplaces(userId, [...stored, row]);
  const created = toAdminWorkplace(row, false);
  if (!created) throw new Error("Failed to create organization.");
  return {
    workplace: created,
    mintError: "Enrollment codes require live org metrics — generate a code from the organization detail.",
    duplicateName,
  };
}

export async function findDuplicateWorkplaceName(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const msg = await softWarnDuplicateName(name, excludeId);
  return Boolean(msg);
}

export async function deleteAdminWorkplace(userId: string, workplaceId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error: tableError } = await client.from("workplace").delete().eq("id", workplaceId);
  if (!tableError) return;
  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingWorkplaces(userId);
  const next = existing
    .filter((workplace) => workplace.workplaceId !== workplaceId)
    .map((workplace) => workplaceRowFromRecord(workplace));

  await writeOnboardingWorkplaces(userId, next);
}

function workplaceRowFromForm(form: AdminWorkplaceFormState, workplaceId: string): WorkplaceRow {
  return {
    id: workplaceId,
    name: form.name.trim(),
    contactEmail: form.contactEmail.trim(),
    contractTier: form.contractTier,
    seatCount: form.seatCount,
    contractStartDate: normalizeOptionalDate(form.contractStartDate),
    contractEndDate: normalizeOptionalDate(form.contractEndDate),
    isActive: form.isActive,
    billingPeriod: form.billingPeriod || null,
    price: parseFormPrice(form.price),
    billingModel: form.billingModel,
    paymentMethod: form.paymentMethod,
    billingNotes: form.billingNotes.trim() || null,
    maxSeats: parseOptionalMaxSeats(form.maxSeats, form.billingModel),
    invoiceStatus: form.invoiceStatus,
  };
}

function workplaceRowFromRecord(workplace: AdminWorkplaceRecord): WorkplaceRow {
  return {
    id: workplace.workplaceId,
    name: workplace.name,
    contactEmail: workplace.contactEmail,
    contractTier: workplace.contractTier,
    seatCount: workplace.seatCount,
    contractStartDate: workplace.contractStartDate,
    contractEndDate: workplace.contractEndDate,
    isActive: workplace.isActive,
    billingPeriod: workplace.billingPeriod,
    price: workplace.price,
    billingModel: workplace.billingModel,
    paymentMethod: workplace.paymentMethod,
    billingNotes: workplace.billingNotes,
    maxSeats: workplace.maxSeats,
    invoiceStatus: workplace.invoiceStatus,
  };
}

export async function updateAdminWorkplace(
  userId: string,
  workplaceId: string,
  form: AdminWorkplaceFormState,
  options?: { activeSeats?: number },
): Promise<AdminWorkplaceRecord> {
  validateWorkplaceForm(form);

  const activeSeats =
    options?.activeSeats ??
    (isValidUuid(workplaceId) ? await fetchAdminWorkplaceActiveSeats(workplaceId).catch(() => 0) : 0);

  if (form.billingModel === "flat_rate" && form.seatCount < activeSeats) {
    throw new Error(
      `Seat count cannot be below current enrolled members (${activeSeats}). Revoke members first.`,
    );
  }

  const maxSeats = parseOptionalMaxSeats(form.maxSeats, form.billingModel);
  if (
    form.billingModel === "pay_per_active" &&
    maxSeats !== null &&
    maxSeats < activeSeats
  ) {
    throw new Error(
      `Max seats cannot be below current enrolled members (${activeSeats}). Revoke members first.`,
    );
  }

  const row = workplaceRowFromForm(form, workplaceId);

  const client = supabase as unknown as UntypedSupabase;
  const { data: updatedRow, error: tableError } = await client
    .from("workplace")
    .update(workplaceInsertPayload(form) as never)
    .eq("id", workplaceId)
    .select(WORKPLACE_SELECT)
    .maybeSingle();

  if (!tableError && updatedRow) {
    const updated = toAdminWorkplace(updatedRow as WorkplaceRow, true);
    if (!updated) throw new Error("Failed to update organization.");
    const [withSeats] = await attachActiveSeats([updated]);
    return withSeats;
  }

  if (!isSchemaUnavailable(tableError)) throw tableError;

  const existing = await readOnboardingWorkplaces(userId);
  let found = false;
  const next = existing.map((workplace) => {
    if (workplace.workplaceId !== workplaceId) return workplaceRowFromRecord(workplace);
    found = true;
    return row;
  });

  if (!found) throw new Error("Organization not found.");
  await writeOnboardingWorkplaces(userId, next);

  const updated = toAdminWorkplace(row, false);
  if (!updated) throw new Error("Failed to update organization.");
  return updated;
}

export function adminWorkplaceToForm(workplace: AdminWorkplaceRecord): AdminWorkplaceFormState {
  return {
    name: workplace.name,
    contactEmail: workplace.contactEmail,
    contractTier: workplace.contractTier,
    seatCount: workplace.seatCount,
    contractStartDate: workplace.contractStartDate ?? "",
    contractEndDate: workplace.contractEndDate ?? "",
    isActive: workplace.isActive,
    billingPeriod: workplace.billingPeriod ?? "",
    price: workplace.price === null || workplace.price === undefined ? "" : String(workplace.price),
    billingModel: workplace.billingModel,
    paymentMethod: workplace.paymentMethod,
    billingNotes: workplace.billingNotes ?? "",
    maxSeats: workplace.maxSeats === null || workplace.maxSeats === undefined ? "" : String(workplace.maxSeats),
    invoiceStatus: workplace.invoiceStatus,
  };
}

export async function fetchAdminWorkplaceActiveSeats(workplaceId: string): Promise<number> {
  const { data, error } = await supabase.rpc("count_workplace_active_seats", {
    p_workplace_id: workplaceId,
  });
  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}

export async function fetchAdminWorkplacePeriodActiveUsers(
  workplaceId: string,
  year?: number,
  month?: number,
): Promise<number> {
  const now = new Date();
  const { data, error } = await supabase.rpc("count_workplace_period_active_users", {
    p_workplace_id: workplaceId,
    p_year: year ?? now.getUTCFullYear(),
    p_month: month ?? now.getUTCMonth() + 1,
  });
  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}

export type WorkplaceMonthlyActiveRow = {
  workplaceId: string;
  workplaceName: string;
  billingModel: BillingModel;
  billingPeriod: BillingPeriod | null;
  seatCount: number;
  maxSeats: number | null;
  price: number | null;
  enrolledCount: number;
  activeCount: number;
};

export async function fetchAdminWorkplaceMonthlyActiveReport(
  year: number,
  month: number,
): Promise<WorkplaceMonthlyActiveRow[]> {
  const { data, error } = await supabase.rpc("admin_workplace_monthly_active_users", {
    p_year: year,
    p_month: month,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      workplaceId: String(r.workplace_id ?? ""),
      workplaceName: String(r.workplace_name ?? ""),
      billingModel: normalizeBillingModel(String(r.billing_model ?? "")),
      billingPeriod: normalizeBillingPeriod(
        r.billing_period === null || r.billing_period === undefined
          ? null
          : String(r.billing_period),
      ),
      seatCount: Number(r.seat_count ?? 0),
      maxSeats:
        r.max_seats === null || r.max_seats === undefined ? null : Number(r.max_seats),
      price: normalizePrice(r.price as number | string | null),
      enrolledCount: Number(r.enrolled_count ?? 0),
      activeCount: Number(r.active_count ?? 0),
    };
  });
}

export function emptyAdminWorkplaceForm(): AdminWorkplaceFormState {
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date();
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  return {
    name: "",
    contactEmail: "",
    contractTier: "pro",
    seatCount: 50,
    contractStartDate: today,
    contractEndDate: nextYear.toISOString().slice(0, 10),
    isActive: true,
    billingPeriod: "yearly",
    price: "",
    billingModel: "flat_rate",
    paymentMethod: "manual_invoice",
    billingNotes: "",
    maxSeats: "",
    invoiceStatus: "draft",
  };
}

export function formatBillingPeriod(value: BillingPeriod | null | undefined): string {
  if (!value) return "—";
  return BILLING_PERIOD_LABELS[value] ?? value;
}

export function formatBillingModel(value: BillingModel | null | undefined): string {
  if (!value) return "—";
  return BILLING_MODEL_LABELS[value] ?? value;
}

export function formatPaymentMethod(value: PaymentMethod | null | undefined): string {
  if (!value) return "—";
  return PAYMENT_METHOD_LABELS[value] ?? value;
}

export function formatInvoiceStatus(value: InvoiceStatus | null | undefined): string {
  if (!value) return "—";
  return INVOICE_STATUS_LABELS[value] ?? value;
}

export function formatWorkplacePrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatSeatUtilization(
  activeSeats: number | undefined,
  seatCount: number,
): string {
  const active = typeof activeSeats === "number" ? activeSeats : "—";
  return `${active} / ${seatCount}`;
}

export function formatPayPerActiveUtilization(workplace: AdminWorkplaceRecord): string {
  const enrolled =
    typeof workplace.activeSeats === "number" ? String(workplace.activeSeats) : "—";
  const period =
    typeof workplace.periodActiveUsers === "number"
      ? String(workplace.periodActiveUsers)
      : "—";
  const max = workplace.maxSeats != null ? ` · max ${workplace.maxSeats}` : "";
  return `${enrolled} enrolled · ${period} active this month · target ${workplace.seatCount}${max}`;
}

/** Non-blocking notice when pay-per-active enrolled headcount exceeds the soft target. */
export function payPerActiveOverTargetMessage(
  billingModel: BillingModel,
  enrolled: number | undefined,
  targetSeats: number,
): string | null {
  if (billingModel !== "pay_per_active") return null;
  if (typeof enrolled !== "number" || enrolled <= targetSeats) return null;
  return `Enrolled members (${enrolled}) exceed the target seats (${targetSeats}). Enrollment stays open unless a max seats hard cap is set.`;
}
