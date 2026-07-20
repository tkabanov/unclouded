import { cn } from "@/lib/utils";
import {
  buildPulseSparklineGeometry,
  describePulseTrend,
  type PulseSparkPoint,
} from "@/lib/dashboard/pulseSparkline";

type PulseSparklineProps = {
  entries: PulseSparkPoint[];
  className?: string;
  width?: number;
  height?: number;
};

export default function PulseSparkline({
  entries,
  className,
  width = 120,
  height = 32,
}: PulseSparklineProps) {
  const geometry = buildPulseSparklineGeometry(entries, width, height);
  const trendLabel = describePulseTrend(entries);

  if (!geometry) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={trendLabel}
          className="text-muted-foreground/40"
        >
          <line
            x1={2}
            y1={height / 2}
            x2={width - 2}
            y2={height / 2}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
        <p className="text-xs text-muted-foreground">Check in to see your trend</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={trendLabel}
        className="overflow-visible"
      >
        <polygon
          points={geometry.area}
          className="fill-primary/15"
        />
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
      <p className="sr-only">{trendLabel}</p>
    </div>
  );
}
