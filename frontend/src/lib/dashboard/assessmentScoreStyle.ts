import { cn } from "@/lib/utils";

/**
 * Score color thresholds from Results Screen Copy:
 * below 3.2 = amber/red, 3.2–3.7 = neutral gray, 3.8+ = green.
 */
export function assessmentScoreTextClass(score: number): string {
  if (score < 3.2) return "text-destructive";
  if (score < 3.8) return "text-muted-foreground";
  return "text-emerald-600";
}

export function assessmentScoreBarClass(score: number): string {
  if (score < 3.2) return "bg-destructive";
  if (score < 3.8) return "bg-muted-foreground/40";
  return "bg-emerald-500";
}

export function assessmentScoreClassName(score: number, className?: string): string {
  return cn("tabular-nums", assessmentScoreTextClass(score), className);
}

/** RGB tuples for client PDF score bars (same thresholds). */
export function assessmentScoreRgb(score: number): [number, number, number] {
  if (score < 3.2) return [200, 70, 70];
  if (score < 3.8) return [140, 148, 148];
  return [40, 160, 110];
}
