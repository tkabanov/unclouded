import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConfirmCopy } from "@/lib/subscription/subscriptionCopy";

export interface SubscriptionConfirmDialogProps {
  open: boolean;
  copy: ConfirmCopy;
  /** Extra rows shown above the buttons, e.g. proration figures. */
  children?: ReactNode;
  /** Non-null keeps the confirm button disabled and shows the loading label. */
  pendingLabel?: string | null;
  /** Blocks confirmation, e.g. while a proration preview is still loading. */
  confirmDisabled?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Shared confirmation shell for every subscription action.
 *
 * While an action is in flight the dialog cannot be dismissed and the confirm
 * button is disabled, so a double-click or an impatient Escape cannot fire a
 * second cancel, resume, or checkout request.
 */
export default function SubscriptionConfirmDialog({
  open,
  copy,
  children,
  pendingLabel = null,
  confirmDisabled = false,
  destructive = false,
  onConfirm,
  onDismiss,
}: SubscriptionConfirmDialogProps) {
  const busy = !!pendingLabel;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onDismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className="pt-2 text-left">{copy.message}</DialogDescription>
        </DialogHeader>

        {children}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onDismiss}>
            {copy.dismissLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "cta"}
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {pendingLabel ?? copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
