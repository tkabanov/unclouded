import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { fetchProgressSignals, type ProgressSignals } from "@/lib/dashboard/progressSignalsApi";
import PulseSparkline from "@/components/dashboard/PulseSparkline";

function formatSessionTrend(signals: ProgressSignals): string {
  const { sessionsThisMonth, sessionsLastMonth } = signals;
  return `${sessionsThisMonth} session${sessionsThisMonth === 1 ? "" : "s"} this month vs ${sessionsLastMonth} last month`;
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

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
    >
      <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}>Your Progress</h2>

      {loading ? (
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>Loading progress signals…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2 rounded-lg bg-accent/30 p-3")}>
            <p className={cn(bubbleStyle("Text_label_"), "text-xs uppercase tracking-wide")}>
              Check-in pulse (30 days)
            </p>
            <PulseSparkline entries={signals?.pulseLast30Days ?? []} className="w-full max-w-[160px]" />
          </div>

          <div className={cn(bubbleStyle("Group_transparent_"), "flex items-start gap-3 rounded-lg bg-accent/30 p-3")}>
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className={cn(bubbleStyle("Text_label_"), "text-xs uppercase tracking-wide")}>Sessions</p>
              <p className="text-sm font-semibold">
                {signals ? formatSessionTrend(signals) : "0 sessions this month vs 0 last month"}
              </p>
            </div>
          </div>

          <div className={cn(bubbleStyle("Group_transparent_"), "flex items-start gap-3 rounded-lg bg-accent/30 p-3")}>
            <Route className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className={cn(bubbleStyle("Text_label_"), "text-xs uppercase tracking-wide")}>Path momentum</p>
              <p className="text-sm font-semibold">
                {signals?.pathsCompletedSinceReassessment ?? 0} path
                {(signals?.pathsCompletedSinceReassessment ?? 0) === 1 ? "" : "s"} completed since reassessment
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
