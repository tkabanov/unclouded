import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AiUsageFilters,
  type CustomRange,
  type PeriodChoice,
} from "@/components/settings/admin/aiUsage/AiUsageFilters";
import {
  fetchAiInsightsOverview,
  type AiInsightsOverview,
} from "@/lib/settings/admin/adminAiInsightsApi";
import { resolvePeriod } from "@/lib/settings/admin/aiUsagePeriod";
import { cn } from "@/lib/utils";

import {
  InsightCountList,
  InsightFeedbackPanel,
  InsightResources,
  InsightSection,
  InsightTopicsTrend,
} from "./AiInsightsPanels";

/**
 * NCLDD-55 (OVR-073) — aggregated insights from AI conversations of users who allow
 * anonymized analysis. No messages, transcripts, names or links to conversations.
 */
function formatModeCount(value: number | null, k: number): string {
  return value == null ? `fewer than ${k} people` : `${value.toLocaleString()} sessions`;
}

export default function AdminAiInsightsTab() {
  const [period, setPeriod] = useState<PeriodChoice>("30d");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [data, setData] = useState<AiInsightsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolved = useMemo(() => {
    if (period === "custom") return customRange;
    return resolvePeriod(period);
  }, [period, customRange]);

  useEffect(() => {
    if (!resolved) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const overview = await fetchAiInsightsOverview(resolved.from, resolved.to);
        if (!cancelled) setData(overview);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Couldn't load AI Insights.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  const k = data?.kThreshold ?? 5;
  const sessions = data?.sample.sessions ?? 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated themes from AI coaching sessions of people who allow anonymized analysis.
          Individual conversations, messages and identities are never shown.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AiUsageFilters
          period={period}
          onPeriodChange={setPeriod}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          hideToday
          disableFromTodayUtc
        />
        <Badge variant="outline">Consenting users only · UTC dates</Badge>
      </div>

      {!resolved ? (
        <Alert>
          <AlertDescription>Pick a start and end date to load insights.</AlertDescription>
        </Alert>
      ) : error && !data ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : data ? (
        <div className={cn("space-y-6", loading && "opacity-60")}>
          <InsightSection title="About this data">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Period:</span>{" "}
                {data.period.from && data.period.to ? (
                  <>
                    {`${data.period.from} → ${data.period.to} (UTC, whole ${data.period.bucket}s).`}{" "}
                    <span className="font-medium text-foreground">Sample:</span>{" "}
                    {data.sample.suppressed
                      ? `fewer than ${k} people — no session insights are shown for this period.`
                      : `about ${data.sample.users.toLocaleString()} people, ${data.sample.sessions.toLocaleString()} sessions (text: ${formatModeCount(data.sample.textSessions, k)}, voice: ${formatModeCount(data.sample.voiceSessions, k)}).`}
                  </>
                ) : (
                  `no complete ${data.period.bucket} in the selected range yet.`
                )}
              </p>
              <p>
                <span className="font-medium text-foreground">Source:</span> finished AI coaching
                sessions (text and voice) of people who currently allow anonymized analysis. Each
                session is automatically sorted into general categories; no message text is stored
                or shown. Anything backed by fewer than {k} people is hidden, and counts are rounded
                to the nearest {k}. Only complete weeks or months before today are included, so the
                range you pick may be widened or shortened. People who turn analysis off are
                removed from every number.
              </p>
            </div>
          </InsightSection>

          {!data.sample.suppressed ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <InsightSection title="Most discussed topics">
                  <InsightCountList
                    rows={data.topics}
                    totalSessions={sessions}
                    kThreshold={k}
                    emptyText="No topic reached the minimum group size."
                  />
                </InsightSection>
                <InsightSection
                  title="Topic trend"
                  hint={`Top topics by ${data.period.bucket}. Buckets with fewer than ${k} people are hidden.`}
                >
                  <InsightTopicsTrend
                    series={data.topicsSeries}
                    topics={data.topics}
                    bucket={data.period.bucket}
                  />
                </InsightSection>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <InsightSection
                  title="Top 20 request types"
                  hint="Generalized types of what people asked for — not their words."
                >
                  <InsightCountList
                    rows={data.requestTypes}
                    totalSessions={sessions}
                    kThreshold={k}
                    numbered
                    emptyText="No request type reached the minimum group size."
                  />
                </InsightSection>
                <InsightSection
                  title="What is on people's minds"
                  hint="Recurring concerns, as general categories."
                >
                  <InsightCountList
                    rows={data.concerns}
                    totalSessions={sessions}
                    kThreshold={k}
                    emptyText="No concern reached the minimum group size."
                  />
                </InsightSection>
              </div>

              <InsightSection
                title="Most mentioned resources"
                hint="Catalog resources Kota recommended or mentioned in sessions."
              >
                <InsightResources
                  resources={data.resources}
                  crisisLines={data.crisisLines}
                  kThreshold={k}
                />
              </InsightSection>
            </>
          ) : null}

          <InsightSection
            title="AI experience feedback"
            hint="From explicit 👍 / 👎 ratings on Kota's replies (text and voice)."
          >
            <InsightFeedbackPanel feedback={data.feedback} kThreshold={k} />
          </InsightSection>
        </div>
      ) : null}
    </div>
  );
}
