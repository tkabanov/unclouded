import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AiVoiceSurfaceStats } from "@/lib/settings/admin/adminAiUsageApi";
import { formatDurationMmSs, formatUsd } from "@/lib/settings/admin/aiUsagePeriod";

export const UNCONFIRMED_USAGE_HINT =
  "Usage of these conversations was not fully confirmed by the browser (closed tab, lost network). Their cost is a lower bound or unknown.";

function Column({ title, stats, realtime }: { title: string; stats: AiVoiceSurfaceStats; realtime: boolean }) {
  // Unconfirmed sessions make realtime spend a lower bound (plan §7.3).
  const lowerBound = realtime && stats.unconfirmedSessions > 0 ? "≥ " : "";
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Spend (est.)</dt>
        <dd className="text-right">{lowerBound + formatUsd(stats.spendUsd)}</dd>
        <dt className="text-muted-foreground">Sessions</dt>
        <dd className="text-right">{stats.sessions}</dd>
        <dt className="text-muted-foreground">Avg cost / session</dt>
        <dd className="text-right">{lowerBound + formatUsd(stats.avgCostPerSessionUsd)}</dd>
        <dt className="text-muted-foreground">Avg duration</dt>
        <dd className="text-right">{formatDurationMmSs(stats.avgDurationSeconds)}</dd>
      </dl>
      {realtime && stats.unconfirmedSessions > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {stats.unconfirmedSessions} with usage not confirmed
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{UNCONFIRMED_USAGE_HINT}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

/** NCLDD-57 — Voice split: push-to-talk voice messages vs realtime Conversation mode. */
export default function AiUsageVoiceSurfaceCard({
  voiceMessages,
  realtimeConversation,
}: {
  voiceMessages: AiVoiceSurfaceStats;
  realtimeConversation: AiVoiceSurfaceStats;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Voice: messages vs conversation</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <Column title="Voice messages" stats={voiceMessages} realtime={false} />
        <Column title="Conversation (realtime)" stats={realtimeConversation} realtime />
      </CardContent>
    </Card>
  );
}
