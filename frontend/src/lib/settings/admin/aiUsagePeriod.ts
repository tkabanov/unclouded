/** NCLDD-52 — period + formatting helpers for the AI Usage dashboard (all dates are UTC). */

export type PeriodPreset = "today" | "7d" | "30d";

export type PeriodSelection = PeriodPreset | { from: string; to: string };

export type ResolvedPeriod = { from: string; to: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Inclusive [from, to] UTC dates; presets end today (UTC). */
export function resolvePeriod(selection: PeriodSelection, now: Date = new Date()): ResolvedPeriod {
  const today = toUtcDateKey(now);
  if (typeof selection !== "string") {
    return selection.from <= selection.to
      ? { from: selection.from, to: selection.to }
      : { from: selection.to, to: selection.from };
  }
  if (selection === "today") return { from: today, to: today };
  const days = selection === "7d" ? 7 : 30;
  const start = new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * DAY_MS);
  return { from: toUtcDateKey(start), to: today };
}

/** `Xm Ys`, or an em dash when there is no data. */
export function formatDurationMmSs(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
}

/** Costs are estimates: tiny amounts keep 4 decimals so they do not collapse to $0.00. */
export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.01 ? 4 : 2;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Percent change vs the prior period; null when the prior value is 0 (no baseline). */
export function pctChange(current: number, prior: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

export function formatPctChange(change: number | null): string {
  if (change == null) return "no prior data";
  const rounded = Math.round(change * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}% vs prior period`;
}
