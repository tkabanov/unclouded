import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BILLING_MODEL_LABELS,
  BILLING_PERIOD_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  emptyAdminWorkplaceForm,
  findDuplicateWorkplaceName,
  formatSeatUtilization,
  payPerActiveOverTargetMessage,
  type AdminWorkplaceFormState,
  type BillingModel,
  type BillingPeriod,
  type ContractTier,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/settings/admin/adminWorkplacesApi";
import { bubbleStyle } from "@/styles";

export interface AddWorkplacePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminWorkplaceFormState) => Promise<void>;
  busy?: boolean;
  editWorkplaceId?: string | null;
  initialForm?: AdminWorkplaceFormState | null;
  /** Current enrolled headcount (edit); used for pay-per-active soft over-target warning. */
  activeSeats?: number;
}

const BILLING_PERIOD_OPTIONS = Object.entries(BILLING_PERIOD_LABELS) as [
  BillingPeriod,
  string,
][];

const BILLING_MODEL_OPTIONS = Object.entries(BILLING_MODEL_LABELS) as [
  BillingModel,
  string,
][];

const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS) as [
  PaymentMethod,
  string,
][];

const INVOICE_STATUS_OPTIONS = Object.entries(INVOICE_STATUS_LABELS) as [
  InvoiceStatus,
  string,
][];

export default function AddWorkplacePopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editWorkplaceId = null,
  initialForm = null,
  activeSeats,
}: AddWorkplacePopupProps) {
  const [form, setForm] = useState<AdminWorkplaceFormState>(emptyAdminWorkplaceForm());
  const [nameWarning, setNameWarning] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const isEdit = Boolean(editWorkplaceId);
  const overTargetWarning = payPerActiveOverTargetMessage(
    form.billingModel,
    activeSeats,
    form.seatCount,
  );
  const savedSeatCount = initialForm?.seatCount;
  const utilizationLine =
    isEdit && typeof savedSeatCount === "number"
      ? form.seatCount !== savedSeatCount
        ? `Utilization: ${formatSeatUtilization(activeSeats, savedSeatCount)} → ${formatSeatUtilization(activeSeats, form.seatCount)}`
        : `Utilization: ${formatSeatUtilization(activeSeats, form.seatCount)}`
      : null;

  useEffect(() => {
    if (open) {
      setForm(initialForm ?? emptyAdminWorkplaceForm());
      setNameWarning(null);
      setLocalError(null);
    }
  }, [open, initialForm]);

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      const duplicate = await findDuplicateWorkplaceName(form.name, editWorkplaceId ?? undefined);
      if (duplicate) {
        setNameWarning("An organization with this name already exists (allowed).");
      }
      await onSubmit(form);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Couldn't save organization.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit organization" : "Add organization"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-workplace-name">Organization name</Label>
            <Input
              id="add-workplace-name"
              className={bubbleStyle("Input_default_")}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            {nameWarning ? <p className="text-xs text-amber-700">{nameWarning}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-workplace-email">HR contact email</Label>
            <Input
              id="add-workplace-email"
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, contactEmail: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-tier">Contract tier</Label>
              <select
                id="add-workplace-tier"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.contractTier}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    contractTier: event.target.value as ContractTier,
                  }))
                }
              >
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-workplace-model">Billing model</Label>
              <select
                id="add-workplace-model"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.billingModel}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    billingModel: event.target.value as BillingModel,
                  }))
                }
              >
                {BILLING_MODEL_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-seats">
                {form.billingModel === "pay_per_active" ? "Target seats" : "Seat count"}
              </Label>
              <Input
                id="add-workplace-seats"
                type="number"
                min={1}
                value={form.seatCount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    seatCount: Number(event.target.value) || 1,
                  }))
                }
              />
              {utilizationLine ? (
                <p className="text-xs text-muted-foreground">{utilizationLine}</p>
              ) : null}
              {overTargetWarning ? (
                <p className="text-xs text-amber-700">{overTargetWarning}</p>
              ) : null}
            </div>

            {form.billingModel === "pay_per_active" ? (
              <div className="grid gap-2">
                <Label htmlFor="add-workplace-max-seats">Max seats (optional hard cap)</Label>
                <Input
                  id="add-workplace-max-seats"
                  type="number"
                  min={1}
                  placeholder="No hard cap"
                  value={form.maxSeats}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, maxSeats: event.target.value }))
                  }
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="add-workplace-payment-term">Payment term</Label>
                <select
                  id="add-workplace-payment-term"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.billingPeriod}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      billingPeriod: event.target.value as BillingPeriod | "",
                    }))
                  }
                >
                  <option value="">Select…</option>
                  {BILLING_PERIOD_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {form.billingModel === "pay_per_active" ? (
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-billing">Payment term</Label>
              <select
                id="add-workplace-billing"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.billingPeriod}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    billingPeriod: event.target.value as BillingPeriod | "",
                  }))
                }
              >
                <option value="">Select…</option>
                {BILLING_PERIOD_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-payment-method">Payment collection</Label>
              <select
                id="add-workplace-payment-method"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: event.target.value as PaymentMethod,
                  }))
                }
              >
                {PAYMENT_METHOD_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-workplace-invoice-status">Invoice status</Label>
              <select
                id="add-workplace-invoice-status"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.invoiceStatus}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    invoiceStatus: event.target.value as InvoiceStatus,
                  }))
                }
              >
                {INVOICE_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-price">Price (USD)</Label>
              <Input
                id="add-workplace-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="Optional"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-notes">Billing notes</Label>
              <Input
                id="add-workplace-notes"
                placeholder="PO number, Stripe customer id…"
                value={form.billingNotes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, billingNotes: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-start">Contract start</Label>
              <Input
                id="add-workplace-start"
                type="date"
                value={form.contractStartDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contractStartDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-end">Contract end</Label>
              <Input
                id="add-workplace-end"
                type="date"
                value={form.contractEndDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contractEndDate: event.target.value }))
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Organization enrollment is active
          </label>

          {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
