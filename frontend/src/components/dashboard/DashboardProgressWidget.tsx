import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Activity, CalendarDays, Heart, Layers, TrendingUp } from "lucide-react";

import PulseSparkline from "@/components/dashboard/PulseSparkline";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchProgressSignals, type ProgressSignals } from "@/lib/dashboard/progressSignalsApi";
import { DASHBOARD_DAILY_CHECKIN_ID } from "@/lib/dashboard/routes";

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-primary" aria-hidden>
          {icon}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{label}</p>
      </div>
      <div className="min-h-[2rem] text-lg font-bold leading-tight text-foreground">{value}</div>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

export default function DashboardProgressWidget() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<ProgressSignals | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSignals = useCallback(async () => {
    if (!user) {
      setSignals(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchProgressSignals(user.id);
      setSignals(next);
    } catch (err) {
      console.error("Failed to load progress signals", err);
      setSignals(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  const pulseEntries = signals?.pulseLast30Days ?? [];
  const hasPulse = pulseEntries.length > 0;
  const sessionsThisMonth = signals?.sessionsThisMonth ?? 0;
  const sessionsLastMonth = signals?.sessionsLastMonth ?? 0;
  const pathsCompleted = signals?.pathsCompletedSinceReassessment ?? 0;

  const scrollToCheckIn = () => {
    document.getElementById(DASHBOARD_DAILY_CHECKIN_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">Your progress</h2>
            <p className="text-sm text-muted-foreground">
              A snapshot of your momentum since joining Unclouded.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={scrollToCheckIn}
        >
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          View trends
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading progress signals…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            icon={<Heart className="h-3.5 w-3.5" />}
            label="Check-in pulse"
            value={
              hasPulse ? (
                <PulseSparkline entries={pulseEntries} className="w-full max-w-[160px]" />
              ) : (
                <span aria-hidden>—</span>
              )
            }
            helper={
              hasPulse
                ? "Last 30 days of check-ins"
                : "Check in to start your 30-day trend"
            }
          />

          <MetricCard
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Sessions"
            value={`${sessionsThisMonth} this month`}
            helper={`vs ${sessionsLastMonth} last month`}
          />

          <MetricCard
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Path momentum"
            value={`${pathsCompleted} completed`}
            helper="Since your last assessment"
          />
        </div>
      )}
    </div>
  );
}
