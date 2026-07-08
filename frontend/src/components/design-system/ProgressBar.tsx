import { cn } from "@/lib/utils";

export type ProgressBarProps = {
  /** Progress value from 0 to 100 (clamped). */
  value: number;
  className?: string;
};

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * RE - progress bar (bTIuS): muted track with primary fill scaled by value.
 */
export function ProgressBar({ value, className }: ProgressBarProps) {
  const percent = clampProgress(value);

  return (
    <div
      data-bubble-id="bTIuS"
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        data-bubble-id="bTIua"
        className="flex min-h-[8px] w-full flex-row overflow-hidden rounded-[4px] bg-[var(--color_aiRNbAaxgr_default)]"
      >
        <div
          data-bubble-id="bTIuZ"
          className="min-h-[8px] rounded-[4px] bg-[var(--color_primary_default)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
