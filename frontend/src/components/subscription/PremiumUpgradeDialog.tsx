import { useEffect, useState } from "react";

import SubscriptionConfirmDialog from "@/components/subscription/SubscriptionConfirmDialog";
import {
  previewPremiumUpgrade,
  type UpgradePreview,
} from "@/lib/subscription/subscriptionApi";
import {
  BILLING_INTERVAL_LABELS,
  formatMoneyFromCents,
  formatSubscriptionDate,
} from "@/lib/subscription/subscriptionFormat";
import {
  FOUNDING_TO_PREMIUM_DIALOG_COPY,
  PRO_TO_PREMIUM_DIALOG_COPY,
} from "@/lib/subscription/subscriptionCopy";

export interface PremiumUpgradeDialogProps {
  open: boolean;
  /** Founding Members get the extra forfeiture warning before confirming. */
  isFoundingMember: boolean;
  pendingLabel?: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Pro → Premium confirmation.
 *
 * Every figure comes from Stripe's upcoming-invoice preview so the amount due
 * today, the prorated Pro balance, and tax match what will actually be charged.
 */
export default function PremiumUpgradeDialog({
  open,
  isFoundingMember,
  pendingLabel = null,
  onConfirm,
  onDismiss,
}: PremiumUpgradeDialogProps) {
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    previewPremiumUpgrade()
      .then((next) => {
        if (!cancelled) setPreview(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPreviewError(
          err instanceof Error ? err.message : "We couldn't calculate your upgrade total.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const rows: { label: string; value: string }[] = preview
    ? [
        { label: "Current plan", value: isFoundingMember ? "Founding Member (Pro)" : "Pro" },
        { label: "New plan", value: "Premium" },
        {
          label: "Remaining Pro balance",
          value:
            formatMoneyFromCents(-preview.remainingBalanceCents, preview.currency) ??
            formatMoneyFromCents(0, preview.currency) ??
            "",
        },
        {
          label: "Premium price",
          value: formatMoneyFromCents(preview.premiumAmountCents, preview.currency) ?? "TBD",
        },
        ...(preview.taxCents > 0
          ? [
              {
                label: "Tax",
                value: formatMoneyFromCents(preview.taxCents, preview.currency) ?? "",
              },
            ]
          : []),
        {
          label: "Amount due today",
          value: formatMoneyFromCents(preview.amountDueCents, preview.currency) ?? "",
        },
        { label: "Billing frequency", value: BILLING_INTERVAL_LABELS[preview.billingInterval] },
        {
          label: "New renewal date",
          value: formatSubscriptionDate(preview.nextRenewalAt) ?? "—",
        },
      ]
    : [];

  return (
    <SubscriptionConfirmDialog
      open={open}
      copy={isFoundingMember ? FOUNDING_TO_PREMIUM_DIALOG_COPY : PRO_TO_PREMIUM_DIALOG_COPY}
      pendingLabel={pendingLabel}
      confirmDisabled={!preview}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
    >
      {previewError ? (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{previewError}</p>
      ) : !preview ? (
        <p className="text-sm text-muted-foreground">Calculating your upgrade total…</p>
      ) : (
        <dl className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </SubscriptionConfirmDialog>
  );
}
