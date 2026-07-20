import { AlertTriangle } from "lucide-react";

import PulseSparkline from "@/components/dashboard/PulseSparkline";
import { cn } from "@/lib/utils";
import {
  MANAGER_MIN_COHORT_SIZE,
  STABILITY_BAND_LABELS,
  type StabilityBand,
} from "@/lib/employer/managerAggregateHelpers";
import type { ManagerAggregateSnapshot } from "@/lib/employer/managerAggregateApi";
import { bubbleStyle } from "@/styles";

type ManagerTeamAggregatePanelProps = {
  snapshot: ManagerAggregateSnapshot | null;
  loading?: boolean;
  className?: string;
};

const STABILITY_BAND_ORDER: StabilityBand[] = ["high", "moderate", "low"];

export function ManagerAggregateLegalBanner() {
  return (
    <div
      role="alert"
      className={cn(
        bubbleStyle("Group_card_muted_"),
        "flex gap-3 border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100",
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="space-y-1">
        <p className="font-semibold">Legal review required before deployment</p>
        <p className="text-amber-900/90 dark:text-amber-100/90">
          REQ-11 manager aggregate data must be reviewed by Dr. Sam and counsel before this view
          ships to production. This preview is for internal validation only — no individual scores
          or identities are shown.
        </p>
      </div>
    </div>
  );
}

export default function ManagerTeamAggregatePanel({
  snapshot,
  loading = false,
  className,
}: ManagerTeamAggregatePanelProps) {
  if (loading) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <ManagerAggregateLegalBanner />
        <p className="text-sm text-muted-foreground">Loading team aggregate…</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <ManagerAggregateLegalBanner />
        <p className="text-sm text-muted-foreground">Load aggregate metrics to preview this view.</p>
      </div>
    );
  }

  const pulseEntries = snapshot.teamPulseTrend30d
    .filter((point) => point.value !== null)
    .map((point) => ({ date: point.date, mood: point.value as number }));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ManagerAggregateLegalBanner />

      <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-4")}>
        <header className="space-y-1">
          <h3 className="font-semibold">Team wellbeing aggregate</h3>
          <p className="text-sm text-muted-foreground">
            Anonymized opt-in cohort only — you cannot see who is enrolled or any individual data.
          </p>
        </header>

        {snapshot.suppressed ? (
          <p className="text-sm text-muted-foreground">
            {snapshot.optedInCount} team member{snapshot.optedInCount === 1 ? "" : "s"} opted in —
            metrics appear when at least {MANAGER_MIN_COHORT_SIZE} people enroll.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Team average pulse (30 days)</p>
                <PulseSparkline entries={pulseEntries} width={160} height={40} />
                <p className="mt-2 text-xs text-muted-foreground">
                  30-day average {snapshot.averagePulse30d ?? "n/a"}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Average session engagement</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {snapshot.averageSessionEngagement ?? "n/a"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Coaching sessions per opted-in team member (last 30 days)
                </p>
              </div>
            </div>

            {snapshot.stabilityBandPercentages ? (
              <div>
                <p className="mb-2 text-sm font-medium">Stability band distribution</p>
                <div className="grid grid-cols-3 gap-2">
                  {STABILITY_BAND_ORDER.map((band) => (
                    <div
                      key={band}
                      className="rounded-md border border-border bg-background/60 px-3 py-2 text-center"
                    >
                      <p className="text-xs text-muted-foreground">{STABILITY_BAND_LABELS[band]}</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {snapshot.stabilityBandPercentages?.[band] ?? 0}%
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Band labels only — not classification names. Based on opted-in members with a
                  stability score.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Stability band distribution unavailable until enough opted-in members have assessment
                scores.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
