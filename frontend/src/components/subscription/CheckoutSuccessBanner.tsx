import { CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface CheckoutSuccessBannerProps {
  message: string;
  onDismiss: () => void;
}

/** Stays visible until dismissed — complements the short-lived Sonner toast after Stripe return. */
export default function CheckoutSuccessBanner({ message, onDismiss }: CheckoutSuccessBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <p className="text-sm text-foreground">{message}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 self-end sm:self-start"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" aria-hidden />
        Dismiss
      </Button>
    </div>
  );
}
