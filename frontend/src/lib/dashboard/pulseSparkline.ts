export type PulseSparkPoint = {
  date: string;
  mood: number;
};

export type PulseSparklineGeometry = {
  polyline: string;
  area: string;
  lastPoint: { x: number; y: number } | null;
};

const PULSE_MIN = 1;
const PULSE_MAX = 10;

function dateKey(value: string): string {
  return value.slice(0, 10);
}

/** One mood value per calendar day — latest check-in wins. */
export function normalizePulseSeries(
  entries: PulseSparkPoint[],
): PulseSparkPoint[] {
  const byDay = new Map<string, PulseSparkPoint>();

  for (const entry of entries) {
    const key = dateKey(entry.date);
    if (!key) continue;
    const mood = Math.min(PULSE_MAX, Math.max(PULSE_MIN, entry.mood));
    byDay.set(key, { date: key, mood });
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildPulseSparklineGeometry(
  entries: PulseSparkPoint[],
  width = 120,
  height = 32,
  padding = 2,
): PulseSparklineGeometry | null {
  const series = normalizePulseSeries(entries);
  if (series.length === 0) return null;

  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);
  const lastIndex = Math.max(series.length - 1, 1);

  const points = series.map((entry, index) => {
    const x = padding + (index / lastIndex) * innerWidth;
    const normalized = (entry.mood - PULSE_MIN) / (PULSE_MAX - PULSE_MIN);
    const y = padding + innerHeight - normalized * innerHeight;
    return { x, y, mood: entry.mood, date: entry.date };
  });

  const polyline = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const baselineY = (padding + innerHeight).toFixed(2);
  const area = `${points
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ")} ${points[points.length - 1].x.toFixed(2)},${baselineY} ${points[0].x.toFixed(2)},${baselineY}`;

  const last = points[points.length - 1];
  return {
    polyline,
    area,
    lastPoint: last ? { x: last.x, y: last.y } : null,
  };
}

export function describePulseTrend(entries: PulseSparkPoint[]): string {
  const series = normalizePulseSeries(entries);
  if (series.length === 0) return "No check-ins in the last 30 days";
  if (series.length === 1) return `Latest check-in pulse ${series[0].mood} of 10`;
  const first = series[0].mood;
  const last = series[series.length - 1].mood;
  if (last > first) return "Pulse trending up over the last 30 days";
  if (last < first) return "Pulse trending down over the last 30 days";
  return "Pulse holding steady over the last 30 days";
}
