import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AiUsageFilters,
  ALL_TIERS,
  type CustomRange,
  type PeriodChoice,
  type TierFilter,
} from "@/components/settings/admin/aiUsage/AiUsageFilters";
import { UNCONFIRMED_USAGE_HINT } from "@/components/settings/admin/aiUsage/AiUsageVoiceSurfaceCard";
import {
  AI_REALTIME_USAGE_STATUSES,
  AI_TIER_LABELS,
  fetchAiRealtimeSessions,
  realtimeSessionCostLabel,
  type AiRealtimeSessionsPage,
  type AiRealtimeUsageStatus,
} from "@/lib/settings/admin/adminAiUsageApi";
import { formatDurationMmSs, formatUsd, resolvePeriod } from "@/lib/settings/admin/aiUsagePeriod";

const PAGE_SIZE = 25;
const ALL_STATUSES = "all";
type StatusFilter = AiRealtimeUsageStatus | typeof ALL_STATUSES;

const STATUS_LABELS: Record<AiRealtimeUsageStatus, string> = {
  complete: "Confirmed",
  partial: "Partial",
  unknown: "Unknown",
  pending: "In progress",
};

const END_REASON_LABELS: Record<string, string> = {
  user_ended: "Ended by user",
  max_duration: "60-min limit",
  idle_timeout: "Idle",
  network_lost: "Network lost",
  connect_failed: "Didn't connect",
  mic_lost: "Mic lost",
  budget_reached: "Budget reached",
  crisis: "Crisis",
  error: "Error",
  abandoned: "Abandoned",
};

function formatStarted(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** NCLDD-57 — one row per realtime Conversation call (plan §4.7, §7.3). */
export default function AiUsageRealtimeSessionsPanel() {
  const [period, setPeriod] = useState<PeriodChoice>("30d");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [tier, setTier] = useState<TierFilter>(ALL_TIERS);
  const [status, setStatus] = useState<StatusFilter>(ALL_STATUSES);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<AiRealtimeSessionsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => (period === "custom" ? customRange : resolvePeriod(period)), [period, customRange]);

  useEffect(() => {
    if (!range) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const result = await fetchAiRealtimeSessions({
          from: range.from,
          to: range.to,
          tier: tier === ALL_TIERS ? null : tier,
          usageStatus: status === ALL_STATUSES ? null : status,
          limit: PAGE_SIZE,
          offset,
        });
        if (!cancelled) setPage(result);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Couldn't load realtime sessions.";
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
  }, [range, tier, status, offset]);

  const total = page?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AiUsageFilters
          period={period}
          onPeriodChange={(value) => {
            setPeriod(value);
            setOffset(0);
          }}
          customRange={customRange}
          onCustomRangeChange={(value) => {
            setCustomRange(value);
            setOffset(0);
          }}
          tier={tier}
          onTierChange={(value) => {
            setTier(value);
            setOffset(0);
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-[170px]" aria-label="Usage status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All usage statuses</SelectItem>
            {AI_REALTIME_USAGE_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && !page ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading && !page ? (
        <Skeleton className="h-64" />
      ) : page && page.rows.length === 0 ? (
        <Alert>
          <AlertDescription>No realtime conversations in this period.</AlertDescription>
        </Alert>
      ) : page ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2 text-right">Duration</th>
                <th className="px-3 py-2">Model · voice</th>
                <th className="px-3 py-2">Ended</th>
                <th className="px-3 py-2 text-right">Text in / cached / out</th>
                <th className="px-3 py-2 text-right">Audio in / cached / out</th>
                <th className="px-3 py-2 text-right">Response</th>
                <th className="px-3 py-2 text-right">Transcription</th>
                <th className="px-3 py-2 text-right">Total (est.)</th>
                <th className="px-3 py-2 text-right">Events seen / saved</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => {
                const cost = realtimeSessionCostLabel(row, formatUsd);
                return (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.email ? `${row.email} · ` : ""}
                        {AI_TIER_LABELS[row.planTier]}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatStarted(row.startedAt)}</td>
                    <td className="px-3 py-2 text-right">{formatDurationMmSs(row.durationSeconds)}</td>
                    <td className="px-3 py-2">
                      <div>{row.model}</div>
                      <div className="text-xs text-muted-foreground">{row.voice}</div>
                    </td>
                    <td className="px-3 py-2">{row.endReason ? (END_REASON_LABELS[row.endReason] ?? row.endReason) : "—"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.inputTokens} / {row.cachedInputTokens} / {row.outputTokens}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.audioInputTokens} / {row.cachedAudioInputTokens} / {row.audioOutputTokens}
                    </td>
                    <td className="px-3 py-2 text-right">{formatUsd(row.responseCostUsd)}</td>
                    <td className="px-3 py-2 text-right">{formatUsd(row.transcriptionCostUsd)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <span>{cost.amount}</span>
                        {cost.unconfirmed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/50 px-1.5 py-0 text-[10px] text-amber-700 dark:text-amber-400"
                              >
                                <AlertTriangle className="h-3 w-3" aria-hidden />
                                {STATUS_LABELS[row.usageStatus]}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">{UNCONFIRMED_USAGE_HINT}</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                      {cost.note ? <div className="text-xs text-muted-foreground">{cost.note}</div> : null}
                      {row.pricingMissing ? <div className="text-xs text-muted-foreground">no price set</div> : null}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-muted-foreground">
                      {row.responsesSeen}/{row.responsesReported} · {row.transcriptionsSeen}/{row.transcriptionsReported}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
