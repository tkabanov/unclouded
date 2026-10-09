import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import AiLimitAuditLog from "@/components/settings/admin/aiUsage/AiLimitAuditLog";
import {
  AI_MODES,
  AI_PLAN_TIERS,
  AI_TIER_LABELS,
  fetchAiPlanLimits,
  saveAiPlanLimit,
  type AiMode,
  type AiPlanLimit,
  type AiPlanTier,
} from "@/lib/settings/admin/adminAiUsageApi";
import { formatLimitInput, parseLimitAmount } from "@/lib/settings/admin/aiLimitValidation";

type DraftKey = `${AiPlanTier}:${AiMode}`;

const key = (tier: AiPlanTier, mode: AiMode): DraftKey => `${tier}:${mode}`;

export default function AiUsageLimitsPanel() {
  const [limits, setLimits] = useState<AiPlanLimit[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyTier, setBusyTier] = useState<AiPlanTier | null>(null);
  const [auditKey, setAuditKey] = useState(0);

  const applyLoaded = useCallback((rows: AiPlanLimit[]) => {
    setLimits(rows);
    setDrafts(
      Object.fromEntries(rows.map((row) => [key(row.planTier, row.mode), formatLimitInput(row.monthlyUsd)])),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAiPlanLimits()
      .then((rows) => {
        if (!cancelled) applyLoaded(rows);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Couldn't load AI limits.");
      });
    return () => {
      cancelled = true;
    };
  }, [applyLoaded]);

  const saved = useMemo(() => {
    const map = new Map<DraftKey, AiPlanLimit>();
    for (const row of limits ?? []) map.set(key(row.planTier, row.mode), row);
    return map;
  }, [limits]);

  const evaluate = (tier: AiPlanTier, mode: AiMode) => {
    const draft = drafts[key(tier, mode)] ?? "";
    const parsed = parseLimitAmount(draft);
    const current = saved.get(key(tier, mode))?.monthlyUsd ?? null;
    return {
      parsed,
      dirty: parsed.ok ? parsed.value !== current : draft !== formatLimitInput(current),
    };
  };

  const saveTier = async (tier: AiPlanTier) => {
    const changes: Array<{ mode: AiMode; value: number | null }> = [];
    for (const mode of AI_MODES) {
      const { parsed, dirty } = evaluate(tier, mode);
      if (!parsed.ok) return;
      if (dirty) changes.push({ mode, value: parsed.value });
    }
    if (changes.length === 0) return;

    setBusyTier(tier);
    try {
      const failures: string[] = [];
      let updated = 0;
      for (const change of changes) {
        const result = await saveAiPlanLimit(tier, change.mode, change.value);
        if (!result.ok) failures.push(result.error ?? `Couldn't save ${change.mode} limit.`);
        else if (result.code !== "no_change") updated += 1;
      }
      // Re-read the confirmed values: success is shown only for what the server applied.
      applyLoaded(await fetchAiPlanLimits());
      setAuditKey((n) => n + 1);
      if (failures.length > 0) toast.error(failures.join(" "));
      else if (updated > 0) toast.success(`${AI_TIER_LABELS[tier]} limits saved.`);
      else toast.info("No changes to save.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the change.");
    } finally {
      setBusyTier(null);
    }
  };

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }
  if (!limits) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Monthly estimated AI spend allowed per user, by plan. Text and voice are tracked separately.
        Leave a field empty for no monetary limit. Amounts reset on the 1st (UTC).
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {AI_PLAN_TIERS.map((tier) => {
          const states = AI_MODES.map((mode) => ({ mode, ...evaluate(tier, mode) }));
          const dirty = states.some((s) => s.dirty);
          const invalid = states.some((s) => !s.parsed.ok);
          const updatedAt = limits
            .filter((l) => l.planTier === tier && l.updatedAt)
            .map((l) => l.updatedAt as string)
            .sort()
            .pop();
          return (
            <Card key={tier} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{AI_TIER_LABELS[tier]}</CardTitle>
                  {dirty ? <Badge variant="outline">Unsaved changes</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {states.map(({ mode, parsed }) => {
                  const id = `ai-limit-${tier}-${mode}`;
                  const current = saved.get(key(tier, mode))?.monthlyUsd ?? null;
                  return (
                    <div key={mode} className="space-y-1">
                      <Label htmlFor={id} className="capitalize">
                        {mode} limit (USD / month)
                      </Label>
                      <Input
                        id={id}
                        inputMode="decimal"
                        value={drafts[key(tier, mode)] ?? ""}
                        placeholder="Not set"
                        disabled={busyTier === tier}
                        aria-invalid={!parsed.ok}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [key(tier, mode)]: event.target.value }))
                        }
                      />
                      {!parsed.ok ? (
                        <p className="text-xs text-destructive">{parsed.error}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Current: {current == null ? "not set" : `$${current.toFixed(2)}`}
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {updatedAt ? `Updated ${new Date(updatedAt).toLocaleDateString()}` : "Never changed"}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!dirty || invalid || busyTier !== null}
                    onClick={() => void saveTier(tier)}
                  >
                    {busyTier === tier ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AiLimitAuditLog refreshKey={auditKey} />
    </div>
  );
}
