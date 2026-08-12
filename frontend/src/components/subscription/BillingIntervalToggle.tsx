import { Button } from "@/components/ui/button";
import type { BillingInterval } from "@/lib/subscription/subscriptionState";
import { cn } from "@/lib/utils";

const INTERVALS: readonly { value: BillingInterval; label: string; tbd?: boolean }[] = [
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly (TBD)", tbd: true },
];

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
  return (
    <div
      role="tablist"
      aria-label="Billing frequency"
      className="inline-flex rounded-lg border border-border bg-muted/50 p-1"
    >
      {INTERVALS.map((interval) => {
        const disabled = !availableIntervals.includes(interval.value);
        const selected = value === interval.value;
        return (
          <Button
            key={interval.value}
            type="button"
            role="tab"
            variant="ghost"
            size="sm"
            aria-selected={selected}
            disabled={disabled && !interval.tbd ? true : disabled}
            className={cn(
              "rounded-md px-4 text-sm",
              selected && "bg-background text-foreground shadow-sm",
              !selected && "text-muted-foreground",
            )}
            onClick={() => {
              if (!disabled) onChange(interval.value);
            }}
          >
            {interval.label}
          </Button>
        );
      })}
    </div>
  );
}
