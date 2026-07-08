import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ADMIN_ANALYTICS_GRID_BUBBLE_ID,
  ADMIN_ANALYTICS_NOTICE_BUBBLE_ID,
  ADMIN_ANALYTICS_NOTICE_TEXT_BUBBLE_ID,
  ADMIN_STAT_CHECKINS_BUBBLE_ID,
  ADMIN_STAT_CHECKINS_LABEL_BUBBLE_ID,
  ADMIN_STAT_CHECKINS_VAL_BUBBLE_ID,
  ADMIN_STAT_ENROLLED_BUBBLE_ID,
  ADMIN_STAT_ENROLLED_LABEL_BUBBLE_ID,
  ADMIN_STAT_ENROLLED_VAL_BUBBLE_ID,
  ADMIN_STAT_MODE_DIST_BUBBLE_ID,
  ADMIN_STAT_MODE_DIST_LABEL_BUBBLE_ID,
  ADMIN_STAT_MODE_DIST_VAL_BUBBLE_ID,
  ADMIN_STAT_TOTAL_USERS_BUBBLE_ID,
  ADMIN_STAT_TOTAL_USERS_LABEL_BUBBLE_ID,
  ADMIN_STAT_TOTAL_USERS_VAL_BUBBLE_ID,
  ADMIN_TAB_ANALYTICS_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  fetchAdminAnalytics,
  type AdminAnalyticsSnapshot,
} from "@/lib/settings/admin/adminAnalyticsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const EMPTY_STATS: AdminAnalyticsSnapshot = {
  totalUsers: 0,
  checkins: 0,
  topCoachingMode: "N/A",
  enrolledUsers: 0,
};

export default function AdminAnalyticsTab() {
  const [stats, setStats] = useState<AdminAnalyticsSnapshot>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdminAnalytics()
      .then((snapshot) => {
        if (!cancelled) setStats(snapshot);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div data-bubble-id={ADMIN_TAB_ANALYTICS_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading analytics…
      </div>
    );
  }

  return (
    <div data-bubble-id={ADMIN_TAB_ANALYTICS_BUBBLE_ID} className="flex flex-col gap-4">
      <div
        data-bubble-id={ADMIN_ANALYTICS_NOTICE_BUBBLE_ID}
        className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
      >
        <p data-bubble-id={ADMIN_ANALYTICS_NOTICE_TEXT_BUBBLE_ID}>
          Read-only aggregates from profiles and journal entries. Demo mode may show low counts.
        </p>
      </div>

      <div
        data-bubble-id={ADMIN_ANALYTICS_GRID_BUBBLE_ID}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          bubbleId={ADMIN_STAT_TOTAL_USERS_BUBBLE_ID}
          labelBubbleId={ADMIN_STAT_TOTAL_USERS_LABEL_BUBBLE_ID}
          valueBubbleId={ADMIN_STAT_TOTAL_USERS_VAL_BUBBLE_ID}
          label="Total users"
          value={String(stats.totalUsers)}
        />
        <StatCard
          bubbleId={ADMIN_STAT_CHECKINS_BUBBLE_ID}
          labelBubbleId={ADMIN_STAT_CHECKINS_LABEL_BUBBLE_ID}
          valueBubbleId={ADMIN_STAT_CHECKINS_VAL_BUBBLE_ID}
          label="Journal entries"
          value={String(stats.checkins)}
        />
        <StatCard
          bubbleId={ADMIN_STAT_MODE_DIST_BUBBLE_ID}
          labelBubbleId={ADMIN_STAT_MODE_DIST_LABEL_BUBBLE_ID}
          valueBubbleId={ADMIN_STAT_MODE_DIST_VAL_BUBBLE_ID}
          label="Top coaching mode"
          value={stats.topCoachingMode}
        />
        <StatCard
          bubbleId={ADMIN_STAT_ENROLLED_BUBBLE_ID}
          labelBubbleId={ADMIN_STAT_ENROLLED_LABEL_BUBBLE_ID}
          valueBubbleId={ADMIN_STAT_ENROLLED_VAL_BUBBLE_ID}
          label="Pro subscribers"
          value={String(stats.enrolledUsers)}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  bubbleId: string;
  labelBubbleId: string;
  valueBubbleId: string;
  label: string;
  value: string;
}

function StatCard({ bubbleId, labelBubbleId, valueBubbleId, label, value }: StatCardProps) {
  return (
    <div
      data-bubble-id={bubbleId}
      className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-2 p-4")}
    >
      <span data-bubble-id={labelBubbleId} className="text-sm text-muted-foreground">
        {label}
      </span>
      <span data-bubble-id={valueBubbleId} className="text-2xl font-bold">
        {value}
      </span>
    </div>
  );
}
