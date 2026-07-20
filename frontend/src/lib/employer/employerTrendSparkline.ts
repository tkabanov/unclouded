import type { WeeklyTrendPoint } from "@/lib/employer/employerMetricsHelpers";

export type TrendSparklineGeometry = {
  polyline: string;
  lastPoint: { x: number; y: number } | null;
};

export function buildTrendSparklineGeometry(
  points: WeeklyTrendPoint[],
  minValue: number,
  maxValue: number,
  width = 140,
  height = 36,
  padding = 2,
): TrendSparklineGeometry | null {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (values.length === 0) return null;

  const range = Math.max(maxValue - minValue, 0.0001);
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);
  const lastIndex = Math.max(points.length - 1, 1);

  const plotted = points
    .map((point, index) => {
      if (point.value === null || !Number.isFinite(point.value)) return null;
      const x = padding + (index / lastIndex) * innerWidth;
      const normalized = (point.value - minValue) / range;
      const y = padding + innerHeight - normalized * innerHeight;
      return { x, y };
    })
    .filter((point): point is { x: number; y: number } => point !== null);

  if (plotted.length === 0) return null;

  return {
    polyline: plotted.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
    lastPoint: plotted[plotted.length - 1] ?? null,
  };
}
