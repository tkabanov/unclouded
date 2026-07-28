import { Button } from "@/components/ui/button";
import { BILLING_INTERVAL_LABELS } from "@/lib/subscription/subscriptionFormat";
import type { BillingInterval } from "@/lib/subscription/subscriptionState";
import { cn } from "@/lib/utils";

const INTERVALS: readonly BillingInterval[] = ["month", "year"];

export interface BillingIntervalToggleProps {
  value: BillingInterval;
  /** Intervals with no confirmed price are rendered disabled, not hidden. */
  availableIntervals: readonly BillingInterval[];
  onChange: (interval: BillingInterval) => void;
}

export default function BillingIntervalToggle({
  value,
  availableIntervals,
  onChange,
}: BillingIntervalToggleProps) {
  const yearlyUnavailable = !availableIntervals.includes("year");

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Billing frequency"
        className="inline-flex rounded-full bg-muted p-1"
      >
        {INTERVALS.map((interval) => {
          const disabled = !availableIntervals.includes(interval);
          return (
            <Button
              key={interval}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={value === interval}
              disabled={disabled}
              className={cn(
                "rounded-full px-4",
                value === interval && "bg-background shadow-sm",
              )}
              onClick={() => onChange(interval)}
            >
              {BILLING_INTERVAL_LABELS[interval]}
            </Button>
          );
        })}
      </div>
      {yearlyUnavailable ? (
        <p className="text-xs text-muted-foreground">Yearly pricing coming soon.</p>
      ) : null}
    </div>
  );
}
