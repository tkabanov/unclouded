import { cn } from "@/lib/utils";

/** Score color thresholds aligned with Lovable dashboard assessment card. */
export function assessmentScoreTextClass(score: number): string {
  if (score < 3.2) return "text-destructive";
  if (score < 3.8) return "text-amber-500";
  return "text-emerald-600";
}

export function assessmentScoreClassName(score: number, className?: string): string {
  return cn("tabular-nums", assessmentScoreTextClass(score), className);
}
