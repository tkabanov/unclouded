import { useMemo, type ReactNode } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AiInsightsOverview,
  InsightCount,
  InsightFeedback,
  InsightResourceCount,
  InsightSeriesPoint,
} from "@/lib/settings/admin/adminAiInsightsApi";
import { topicLabel } from "@/lib/settings/admin/adminAiInsightsApi";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 173 58% 39%))",
  "hsl(var(--chart-3, 197 37% 24%))",
  "hsl(var(--chart-4, 43 74% 49%))",
  "hsl(var(--chart-5, 27 87% 67%))",
];

const TREND_TOPIC_LIMIT = 5;

export function InsightSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function InsightEmpty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function hiddenRowsNote(k: number) {
  return `Items mentioned by fewer than ${k} people are hidden.`;
}

/** Ranked horizontal bars; share is relative to sessions in the sample. */
export function InsightCountList({
  rows,
  totalSessions,
  kThreshold,
  numbered = false,
  emptyText,
}: {
  rows: InsightCount[];
  totalSessions: number;
  kThreshold: number;
  numbered?: boolean;
  emptyText: string;
}) {
  if (rows.length === 0) return <InsightEmpty>{emptyText}</InsightEmpty>;
  const max = Math.max(...rows.map((row) => row.sessions), 1);
  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 text-foreground">
                {numbered ? (
                  <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
                ) : null}
                {row.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.sessions.toLocaleString()} sessions
                {totalSessions > 0 ? ` · ${Math.round((row.sessions / totalSessions) * 100)}%` : ""}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${Math.max(2, (row.sessions / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">{hiddenRowsNote(kThreshold)}</p>
    </div>
  );
}

export function InsightTopicsTrend({
  series,
  topics,
  bucket,
}: {
  series: InsightSeriesPoint[];
  topics: InsightCount[];
  bucket: AiInsightsOverview["period"]["bucket"];
}) {
  const topKeys = useMemo(() => topics.slice(0, TREND_TOPIC_LIMIT).map((t) => t.key), [topics]);
  const data = useMemo(() => {
    const byBucket = new Map<string, Record<string, number | string>>();
    for (const point of series) {
      if (!topKeys.includes(point.key)) continue;
      const row = byBucket.get(point.bucket) ?? { bucket: point.bucket };
      row[point.key] = point.sessions;
      byBucket.set(point.bucket, row);
    }
    return [...byBucket.values()].sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
  }, [series, topKeys]);

  if (data.length < 2) {
    return (
      <InsightEmpty>
        Not enough data for a trend yet — at least two {bucket}s with enough people are needed.
      </InsightEmpty>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="bucket" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} width={32} />
          <Tooltip
            labelFormatter={(label: string) => `${bucket === "week" ? "Week of" : "Month of"} ${label}`}
          />
          <Legend formatter={(value: string) => topicLabel(value)} />
          {topKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InsightResources({
  resources,
  crisisLines,
  kThreshold,
}: {
  resources: InsightResourceCount[];
  crisisLines: AiInsightsOverview["crisisLines"];
  kThreshold: number;
}) {
  return (
    <div className="space-y-3">
      {resources.length === 0 ? (
        <InsightEmpty>No catalog resource was mentioned by enough people in this period.</InsightEmpty>
      ) : (
        <ol className="divide-y divide-border">
          {resources.map((resource, index) => (
            <li
              key={resource.resourceId}
              className="flex items-baseline justify-between gap-3 py-2 text-sm"
            >
              <span className="min-w-0 text-foreground">
                <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
                {resource.title}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {resource.sessions.toLocaleString()} sessions
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-sm text-muted-foreground">
        Crisis lines (988 / 741741 / 911):{" "}
        {crisisLines.suppressed
          ? `fewer than ${kThreshold} people`
          : `${crisisLines.sessions.toLocaleString()} sessions`}
      </p>
      <p className="text-xs text-muted-foreground">{hiddenRowsNote(kThreshold)}</p>
    </div>
  );
}

export function InsightFeedbackPanel({
  feedback,
  kThreshold,
}: {
  feedback: InsightFeedback;
  kThreshold: number;
}) {
  if (feedback.suppressed) {
    return (
      <InsightEmpty>
        Fewer than {kThreshold} people rated Kota's replies in this period, so no rating is shown.
        Ratings come only from explicit 👍 / 👎 — nothing is inferred from conversations.
      </InsightEmpty>
    );
  }

  const positive = feedback.reasons.filter((reason) => reason.rating === 1);
  const negative = feedback.reasons.filter((reason) => reason.rating === -1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Helpful share</p>
          <p className="text-3xl font-bold text-foreground">≈{Math.round(feedback.upShare * 100)}%</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">👍 / 👎</p>
          <p className="text-3xl font-bold text-foreground">
            {feedback.up.toLocaleString()} / {feedback.down.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Rated replies</p>
          <p className="text-3xl font-bold text-foreground">{feedback.ratedMessages.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">from {feedback.raters.toLocaleString()} people</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReasonList title="What people found useful" reasons={positive} />
        <ReasonList title="What felt inconvenient" reasons={negative} />
      </div>
      <p className="text-xs text-muted-foreground">
        Based only on explicit ratings given after people allowed analysis. Counts are rounded to the
        nearest {kThreshold}; reasons chosen by fewer than {kThreshold} people are hidden.
      </p>
    </div>
  );
}

function ReasonList({
  title,
  reasons,
}: {
  title: string;
  reasons: { key: string; label: string; count: number }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {reasons.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not enough data.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {reasons.map((reason) => (
            <li key={reason.key} className="flex justify-between gap-3">
              <span className="text-foreground">{reason.label}</span>
              <span className="tabular-nums text-muted-foreground">{reason.count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
