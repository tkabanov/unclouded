import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AI_TIER_LABELS,
  describeAuditValue,
  fetchAiLimitAudit,
  type AiLimitAuditAction,
  type AiLimitAuditRow,
  type AiPlanTier,
} from "@/lib/settings/admin/adminAiUsageApi";

const PAGE_SIZE = 10;

const ACTION_LABELS: Record<AiLimitAuditAction, string> = {
  plan_limit_set: "Plan limit changed",
  user_override_set: "Custom user limit set",
  user_unlimited_set: "User set to unlimited",
  user_override_cleared: "User limit reset to plan",
  user_limit_restored: "User limit restored",
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function targetLabel(row: AiLimitAuditRow): string {
  if (row.action === "plan_limit_set") {
    const tier = row.planTier as AiPlanTier | null;
    return tier && tier in AI_TIER_LABELS ? `${AI_TIER_LABELS[tier]} plan` : "Plan";
  }
  return row.targetName ?? "Deleted user";
}

/** Journal of every limit change; pass `userId` to scope it to one user. */
export default function AiLimitAuditLog({
  userId = null,
  refreshKey = 0,
  compact = false,
}: {
  userId?: string | null;
  /** Bump to reload after a mutation. */
  refreshKey?: number;
  compact?: boolean;
}) {
  const [rows, setRows] = useState<AiLimitAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isCancelled: () => boolean) => {
      setLoading(true);
      setError(null);
      try {
        const page = await fetchAiLimitAudit({ limit: PAGE_SIZE, offset, userId });
        if (isCancelled()) return;
        setRows(page.rows);
        setTotal(page.total);
      } catch (err) {
        if (!isCancelled()) setError(err instanceof Error ? err.message : "Couldn't load history.");
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [offset, userId],
  );

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey]);

  useEffect(() => {
    setOffset(0);
  }, [userId, refreshKey]);

  return (
    <section className="space-y-2" aria-label="AI limit change history">
      <h3 className="text-sm font-semibold">Change history</h3>
      {loading && rows.length === 0 ? (
        <Skeleton className="h-24" />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No limit changes yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Admin</th>
                {compact ? null : <th className="py-2 pr-3">Target</th>}
                <th className="py-2 pr-3">Change</th>
                <th className="py-2">Old → new</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                    {formatWhen(row.createdAt)}
                  </td>
                  <td className="py-2 pr-3">{row.actorName ?? "Unknown"}</td>
                  {compact ? null : <td className="py-2 pr-3">{targetLabel(row)}</td>}
                  <td className="py-2 pr-3">
                    {ACTION_LABELS[row.action] ?? row.action} ({row.mode})
                  </td>
                  <td className="py-2">
                    {describeAuditValue(row.action, row.oldValue)} →{" "}
                    {describeAuditValue(row.action, row.newValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    </section>
  );
}
