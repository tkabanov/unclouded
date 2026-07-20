import { cn } from "@/lib/utils";
import type { WeeklyTrendPoint } from "@/lib/employer/employerMetricsHelpers";
import { formatWeekLabel } from "@/lib/employer/employerMetricsHelpers";
import { buildTrendSparklineGeometry } from "@/lib/employer/employerTrendSparkline";

type EmployerTrendSparklineProps = {
  points: WeeklyTrendPoint[];
  minValue: number;
  maxValue: number;
  className?: string;
  emptyLabel?: string;
};

export default function EmployerTrendSparkline({
  points,
  minValue,
  maxValue,
  className,
  emptyLabel = "Not enough data yet",
}: EmployerTrendSparklineProps) {
  const geometry = buildTrendSparklineGeometry(points, minValue, maxValue);
  const firstLabel = points[0] ? formatWeekLabel(points[0].weekStart) : "";
  const lastLabel = points[points.length - 1]
    ? formatWeekLabel(points[points.length - 1].weekStart)
    : "";

  if (!geometry) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>{emptyLabel}</p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <svg
        width={140}
        height={36}
        viewBox="0 0 140 36"
        role="img"
        aria-label="Weekly trend sparkline"
        className="w-full max-w-[160px]"
      >
        <polyline
          points={geometry.polyline}
          fill="none"
          className="stroke-primary"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {geometry.lastPoint ? (
          <circle
            cx={geometry.lastPoint.x}
            cy={geometry.lastPoint.y}
            r={2.5}
            className="fill-primary"
          />
        ) : null}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>
    </div>
  );
}
