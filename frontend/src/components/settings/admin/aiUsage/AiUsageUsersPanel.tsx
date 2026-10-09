import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AiUserLimitDialog from "@/components/settings/admin/aiUsage/AiUserLimitDialog";
import { ALL_TIERS, type TierFilter } from "@/components/settings/admin/aiUsage/AiUsageFilters";
import {
  AI_PLAN_TIERS,
  AI_TIER_LABELS,
  fetchAiUsageUsers,
  type AiEffectiveLimit,
  type AiUsageUsersPage,
} from "@/lib/settings/admin/adminAiUsageApi";
import { formatUsd } from "@/lib/settings/admin/aiUsagePeriod";

const PAGE_SIZE = 25;
const ALL_STATUSES = "all";
type StatusFilter = "ok" | "exceeded" | typeof ALL_STATUSES;

function LimitCell({ limit }: { limit: AiEffectiveLimit }) {
  const badge =
    limit.source === "custom" ? "Custom" : limit.source === "unlimited" ? "Unlimited" : limit.source === "plan" ? "Plan" : "No limit";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span>{limit.source === "unlimited" ? "∞" : limit.limitUsd == null ? "—" : formatUsd(limit.limitUsd)}</span>
        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
          {badge}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        used {formatUsd(limit.usedUsd)}
        {limit.remainingUsd != null ? ` · left ${formatUsd(limit.remainingUsd)}` : ""}
      </div>
    </div>
  );
}

export default function AiUsageUsersPanel() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<TierFilter>(ALL_TIERS);
  const [status, setStatus] = useState<StatusFilter>(ALL_STATUSES);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<AiUsageUsersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput);
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const result = await fetchAiUsageUsers({
          search,
          tier: tier === ALL_TIERS ? null : tier,
          status: status === ALL_STATUSES ? null : status,
          limit: PAGE_SIZE,
          offset,
        });
        if (!cancelled) setPage(result);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Couldn't load users.";
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
  }, [search, tier, status, offset, reloadKey]);

  const total = page?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name or email"
          className="w-64"
          aria-label="Search users"
        />
        <Select
          value={tier}
          onValueChange={(value) => {
            setTier(value as TierFilter);
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-[170px]" aria-label="Plan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TIERS}>All plans</SelectItem>
            {AI_PLAN_TIERS.map((value) => (
              <SelectItem key={value} value={value}>
                {AI_TIER_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="exceeded">Exceeded</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">Current month{page?.monthKey ? ` ${page.monthKey}` : ""} · estimated</Badge>
      </div>

      {error && !page ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading && !page ? (
        <Skeleton className="h-64" />
      ) : page && page.rows.length === 0 ? (
        <Alert>
          <AlertDescription>No users match these filters.</AlertDescription>
        </Alert>
      ) : page ? (
        <div className={loading ? "overflow-x-auto opacity-60" : "overflow-x-auto"}>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2 pr-3 text-right">Sessions</th>
                <th className="py-2 pr-3 text-right">Spend</th>
                <th className="py-2 pr-3">Text limit</th>
                <th className="py-2 pr-3">Voice limit</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => {
                const exceeded = row.text.exceeded || row.voice.exceeded;
                return (
                  <tr key={row.userId} className="border-t border-border align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{row.displayName}</div>
                      {row.email ? <div className="text-xs text-muted-foreground">{row.email}</div> : null}
                    </td>
                    <td className="py-2 pr-3">{AI_TIER_LABELS[row.tier]}</td>
                    <td className="py-2 pr-3 text-right">{row.sessions}</td>
                    <td className="py-2 pr-3 text-right">{formatUsd(row.spendUsd)}</td>
                    <td className="py-2 pr-3">
                      <LimitCell limit={row.text} />
                    </td>
                    <td className="py-2 pr-3">
                      <LimitCell limit={row.voice} />
                    </td>
                    <td className="py-2 pr-3">
                      {exceeded ? <Badge variant="destructive">Exceeded</Badge> : <Badge variant="outline">OK</Badge>}
                    </td>
                    <td className="py-2 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => setSelectedUserId(row.userId)}>
                        Manage
                      </Button>
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

      <AiUserLimitDialog
        userId={selectedUserId}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
        onChanged={() => setReloadKey((n) => n + 1)}
      />
    </div>
  );
}
