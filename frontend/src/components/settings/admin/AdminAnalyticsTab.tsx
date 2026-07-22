import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  downloadSessionArchiveCsv,
  exportSessionArchiveCsv,
  fetchPromptLibraryReviewSignals,
  PROMPT_REVIEW_CADENCE_CHECKLIST,
  type PromptReviewSignals,
} from "@/lib/admin/promptLibraryReviewAnalytics";
import {
  ADMIN_REFERRAL_SIGNUPS_EMPTY_TEXT,
  ADMIN_REFERRAL_SIGNUPS_HEADING,
  ADMIN_REFERRAL_SIGNUPS_SUBTITLE,
  fetchReferralSignUpStats,
  formatReferralConversionRate,
  formatReferralSignUpDate,
  type ReferralSignUpStat,
} from "@/lib/settings/admin/referralSignUpAnalytics";
import { formatReferralPartnerLabel } from "@/lib/settings/admin/referralPartnerLabels";
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
  const [referralSignUps, setReferralSignUps] = useState<ReferralSignUpStat[]>([]);
  const [promptReview, setPromptReview] = useState<PromptReviewSignals | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingArchive, setExportingArchive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchAdminAnalytics(),
      fetchReferralSignUpStats(),
      fetchPromptLibraryReviewSignals(),
    ])
      .then(([snapshot, referralStats, review]) => {
        if (!cancelled) {
          setStats(snapshot);
          setReferralSignUps(referralStats);
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

  async function handleExportSessionArchive() {
    setExportingArchive(true);
    try {
      const csv = await exportSessionArchiveCsv();
      downloadSessionArchiveCsv(csv);
      toast.success("Session archive CSV downloaded.");
    } catch {
      toast.error("Couldn't export session archive.");
    } finally {
      setExportingArchive(false);
    }
  }

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

      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-3 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>{ADMIN_REFERRAL_SIGNUPS_HEADING}</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
          {ADMIN_REFERRAL_SIGNUPS_SUBTITLE}
        </p>
        <ReviewTable
          headers={["Referral code", "Sign-ups", "Paid", "Conv. rate", "Last sign-up"]}
          rows={referralSignUps.map((row) => [
            formatReferralPartnerLabel(row.referralCode),
            String(row.signUpCount),
            String(row.paidConversionCount),
            formatReferralConversionRate(row.conversionRate),
            formatReferralSignUpDate(row.lastSignUpAt),
          ])}
          emptyText={ADMIN_REFERRAL_SIGNUPS_EMPTY_TEXT}
        />
      </div>

      {promptReview ? (
        <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-4 p-6")}>
          <div className="space-y-1">
            <h3 className={bubbleStyle("Text_heading_3_")}>Prompt library review (REQ-16)</h3>
            <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
              {promptReview.reviewCadence}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {promptReview.dataLimitation}
            </p>
            <p className="text-xs text-muted-foreground">
              {promptReview.profilesAnalyzed} profiles · {promptReview.sessionsAnalyzed} sessions
              analyzed ({promptReview.archivedSessions} archive ·{" "}
              {promptReview.legacyMemorySessions} legacy memory)
            </p>
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {PROMPT_REVIEW_CADENCE_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportingArchive}
              onClick={() => void handleExportSessionArchive()}
            >
              {exportingArchive ? "Exporting…" : "Export session archive CSV"}
            </Button>
          </div>

          <ReviewSection title="1. Classification → continued engagement">
            <ReviewTable
              headers={["Classification", "Users", "Avg sessions", "Continued engagement"]}
              rows={promptReview.classificationEngagement.slice(0, 8).map((row) => [
                row.classification,
                String(row.userCount),
                String(row.avgSessionsPerUser),
                row.continuedEngagementRate == null
                  ? "n/a"
                  : `${Math.round(row.continuedEngagementRate * 100)}%`,
              ])}
              emptyText="No classification data yet."
            />
          </ReviewSection>

          <ReviewSection title="2. Exchange count at session end">
            <p className="text-sm text-muted-foreground">
              Peak bucket: {promptReview.peakExchangeBucket ?? "n/a"} · Average exchanges:{" "}
              {promptReview.averageExchangeCount ?? "n/a"}
            </p>
            <ReviewTable
              headers={["Exchange band", "Sessions", "Sample themes at close"]}
              rows={promptReview.exchangeCountDistribution.map((row) => [
                row.label,
                String(row.sessionCount),
                row.sampleThemes.length > 0 ? row.sampleThemes.join("; ") : "—",
              ])}
              emptyText="Exchange telemetry appears after users finalize sessions (post-deploy)."
            />
          </ReviewSection>

          <ReviewSection title="3. Commitment follow-through">
            <p className="text-sm">
              Overall follow-through:{" "}
              {promptReview.commitmentFollowThroughRate == null
                ? "n/a"
                : `${Math.round(promptReview.commitmentFollowThroughRate * 100)}%`}
            </p>
            <ReviewTable
              headers={["Commitment type", "Tracked", "Followed", "Rate"]}
              rows={promptReview.commitmentByCategory.slice(0, 6).map((row) => [
                row.category,
                String(row.tracked),
                String(row.followed),
                row.followThroughRate == null
                  ? "n/a"
                  : `${Math.round(row.followThroughRate * 100)}%`,
              ])}
              emptyText="No micro-commitments recorded in session memory yet."
            />
          </ReviewSection>

          <ReviewSection title="4. Load signals → disengagement (≥14 days idle)">
            <p className="text-sm text-muted-foreground">
              Combinations with ≥3 users, sorted by disengagement rate.
            </p>
            <ReviewTable
              headers={["Load combination", "Users", "Disengaged", "Rate"]}
              rows={promptReview.loadSignalDisengagement.slice(0, 6).map((row) => [
                row.loadCombination,
                String(row.userCount),
                String(row.disengagedCount),
                row.disengagementRate == null
                  ? "n/a"
                  : `${Math.round(row.disengagementRate * 100)}%`,
              ])}
              emptyText="Not enough load-signal cohort data yet (minimum 3 users per combination)."
            />
          </ReviewSection>
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

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </section>
  );
}

function ReviewTable({
  headers,
  rows,
  emptyText,
}: {
  headers: string[];
  rows: string[][];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {headers.map((header) => (
              <th key={header} className="py-2 pr-4 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-b border-border/60">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cell}-${cellIndex}`}
                  className={cn(
                    "py-2 pr-4 align-top",
                    cellIndex > 0 && "tabular-nums",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
