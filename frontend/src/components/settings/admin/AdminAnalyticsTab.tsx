import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ADMIN_ANALYTICS_NOTICE_COPY,
  ADMIN_STAT_CHECKINS_LABEL,
  ADMIN_STAT_ENROLLED_LABEL,
  ADMIN_STAT_MODE_DIST_LABEL,
  ADMIN_STAT_TOTAL_USERS_LABEL,
  fetchAdminAnalytics,
  type AdminAnalyticsSnapshot,
} from "@/lib/settings/admin/adminAnalyticsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const EMPTY_STATS: AdminAnalyticsSnapshot = {
  totalUsers: 0,
  checkinsLast7Days: 0,
  mostActiveMode: "N/A",
  pathEnrollments: 0,
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
      <div className="text-sm text-muted-foreground">
        Loading analytics…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
      >
        <p>{ADMIN_ANALYTICS_NOTICE_COPY}</p>
      </div>

      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label={ADMIN_STAT_TOTAL_USERS_LABEL}
          value={String(stats.totalUsers)}
        />
        <StatCard
          label={ADMIN_STAT_CHECKINS_LABEL}
          value={String(stats.checkinsLast7Days)}
        />
        <StatCard
          label={ADMIN_STAT_MODE_DIST_LABEL}
          value={stats.mostActiveMode}
        />
        <StatCard
          label={ADMIN_STAT_ENROLLED_LABEL}
          value={String(stats.pathEnrollments)}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
    label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div
      className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-2 p-4")}
    >
      <span className="text-sm text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-bold">
        {value}
      </span>
    </div>
  );
}
