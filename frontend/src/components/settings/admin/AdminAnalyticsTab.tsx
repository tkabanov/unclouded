import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ADMIN_ANALYTICS_NOTICE_COPY,
  ADMIN_STAT_AVG_MODULES_LABEL,
  ADMIN_STAT_CHECKINS_LABEL,
  ADMIN_STAT_ENROLLED_LABEL,
  ADMIN_STAT_MODE_DIST_LABEL,
  ADMIN_STAT_MODULE_COMPLETIONS_HEADING,
  ADMIN_STAT_TOTAL_USERS_LABEL,
  ADMIN_STAT_USERS_WITH_MODULES_LABEL,
  fetchAdminAnalytics,
  formatModuleCompletionLabel,
  type AdminAnalyticsSnapshot,
} from "@/lib/settings/admin/adminAnalyticsApi";
import {
  fetchPromptLibraryReviewSignals,
  type PromptReviewSignals,
} from "@/lib/admin/promptLibraryReviewAnalytics";
import { MODULE_SLUGS } from "@/lib/modules/moduleSlugs";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const EMPTY_STATS: AdminAnalyticsSnapshot = {
  totalUsers: 0,
  checkinsLast7Days: 0,
  mostActiveMode: "N/A",
  pathEnrollments: 0,
  usersWithOneOrMoreModules: 0,
  averageModulesCompleted: 0,
  moduleCompletionCounts: {
    identity: 0,
    relational: 0,
    history: 0,
    financial: 0,
    body: 0,
    meaning: 0,
  },
};

export default function AdminAnalyticsTab() {
  const [stats, setStats] = useState<AdminAnalyticsSnapshot>(EMPTY_STATS);
  const [promptReview, setPromptReview] = useState<PromptReviewSignals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchAdminAnalytics(), fetchPromptLibraryReviewSignals()])
      .then(([snapshot, review]) => {
        if (!cancelled) {
          setStats(snapshot);
          setPromptReview(review);
        }
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
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
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
        <StatCard
          label={ADMIN_STAT_USERS_WITH_MODULES_LABEL}
          value={String(stats.usersWithOneOrMoreModules)}
        />
        <StatCard
          label={ADMIN_STAT_AVG_MODULES_LABEL}
          value={String(stats.averageModulesCompleted)}
        />
      </div>

      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-3 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>{ADMIN_STAT_MODULE_COMPLETIONS_HEADING}</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
          Aggregated completion counts per module (no individual user data).
        </p>
        <ul className="divide-y divide-border text-sm">
          {MODULE_SLUGS.map((slug) => (
            <li key={slug} className="flex items-center justify-between py-2">
              <span>{formatModuleCompletionLabel(slug)}</span>
              <span className="font-semibold tabular-nums">
                {stats.moduleCompletionCounts[slug]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {promptReview ? (
        <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-3 p-6")}>
          <h3 className={bubbleStyle("Text_heading_3_")}>Prompt library review (REQ-16)</h3>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
            {promptReview.reviewCadence}
          </p>
          <p className="text-sm text-muted-foreground">{promptReview.highLoadDisengagementNote}</p>
          <p className="text-sm">
            Commitment follow-through:{" "}
            {promptReview.commitmentFollowThroughRate == null
              ? "n/a"
              : `${Math.round(promptReview.commitmentFollowThroughRate * 100)}%`}
          </p>
          <ul className="divide-y divide-border text-sm">
            {promptReview.sessionsByClassification.slice(0, 8).map((row) => (
              <li key={row.classification} className="flex items-center justify-between py-2">
                <span>{row.classification}</span>
                <span className="font-semibold tabular-nums">{row.sessionCount}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
