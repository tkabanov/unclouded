import { cn } from "@/lib/utils";

const SEGMENTS = [
  { groupId: "bTIIU", shapeId: "bTIIh", value: 1 },
  { groupId: "bTIIO", shapeId: "bTIIn", value: 2 },
  { groupId: "bTIII", shapeId: "bTIIt", value: 3 },
  { groupId: "bTIIC", shapeId: "bTIIz", value: 4 },
  { groupId: "bTIHw", shapeId: "bTIJF", value: 5 },
] as const;

/** Static style scaffold from Bubble HTML element bTIJL (dynamic width rules implemented in React). */
const BUBBLE_BAR_STYLE_HTML = `<style>
#bar1 { max-width: 100% !important; }
#bar2 { max-width: 100% !important; }
#bar3 { max-width: 100% !important; }
#bar4 { max-width: 100% !important; }
#bar5 { max-width: 100% !important; }
</style>`;

export type ScoreBarProps = {
  /** Selected score from 1 to 5 (clamped). */
  score: number;
  /** Optional labels for each segment (index 0 = score 1). */
  labels?: string[];
  /** When provided, segments are clickable and invoke this callback. */
  onChange?: (score: number) => void;
  className?: string;
};

function clampScore(score: number): number {
  return Math.min(5, Math.max(1, Math.round(score)));
}

/**
 * RE - score bar (bTIHr): five-segment score indicator with cumulative primary fill.
 */
export function ScoreBar({ score, labels, onChange, className }: ScoreBarProps) {
  const clamped = clampScore(score);
  const interactive = Boolean(onChange);

  return (
    <div
      className={cn("flex w-full flex-col gap-1", className)}
    >
      <div
        className="flex w-full flex-row gap-1"
        role={interactive ? "radiogroup" : undefined}
        aria-label={interactive ? "Score" : undefined}
      >
        {SEGMENTS.map((segment, index) => {
          const filled = clamped >= segment.value;
          const segmentClassName = cn(
            "flex min-h-[8px] min-w-0 flex-1 flex-row overflow-hidden rounded-[4px] bg-muted",
            interactive && "cursor-pointer border-0 p-0",
          );

          const shape = (
            <div
              className={cn(
                "min-h-[8px] rounded-[4px] bg-primary transition-[max-width] duration-150",
                filled ? "w-full max-w-full" : "max-w-0",
              )}
            />
          );

          if (interactive) {
            return (
              <button
                key={segment.groupId}
                type="button"
                role="radio"
                aria-checked={clamped === segment.value}
                aria-label={labels?.[index] ?? `Score ${segment.value}`}
                className={segmentClassName}
                onClick={() => onChange?.(segment.value)}
              >
                {shape}
              </button>
            );
          }

          return (
            <div
              key={segment.groupId}
              className={segmentClassName}
            >
              {shape}
            </div>
          );
        })}

        <div
          className="sr-only"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: BUBBLE_BAR_STYLE_HTML }}
        />
      </div>

      {labels && labels.length > 0 ? (
        <div className="flex w-full flex-row gap-1">
          {SEGMENTS.map((segment, index) => (
            <span
              key={`${segment.groupId}-label`}
              className="min-w-0 flex-1 text-center text-xs text-foreground"
            >
              {labels[index] ?? ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
