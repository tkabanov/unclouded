import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BookingError } from "@/components/coach/booking/types";

type BookingUnavailableAlertProps = {
  error: BookingError;
  onAction: () => void;
};

export default function BookingUnavailableAlert({
  error,
  onAction,
}: BookingUnavailableAlertProps) {
  const actionLabel =
    error.action === "chooseCoach" ? "Choose another coach" : "Pick another time";

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <p className="text-xs text-foreground">{error.message}</p>
      </div>
      <Button type="button" size="sm" variant="outline" className="h-7 self-start text-xs" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
