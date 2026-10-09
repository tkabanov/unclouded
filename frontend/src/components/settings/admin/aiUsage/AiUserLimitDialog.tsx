import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import AiLimitAuditLog from "@/components/settings/admin/aiUsage/AiLimitAuditLog";
import {
  AI_MODES,
  AI_TIER_LABELS,
  fetchAiUserLimitDetail,
  restoreAiUserLimit,
  setAiUserLimit,
  type AiMode,
  type AiMutationResult,
  type AiUserLimitDetail,
  type AiUserLimitKind,
} from "@/lib/settings/admin/adminAiUsageApi";
import { formatLimitInput, parseLimitAmount } from "@/lib/settings/admin/aiLimitValidation";
import { describeEffectiveLimit } from "@/lib/settings/admin/aiLimitLabels";
import { formatUsd } from "@/lib/settings/admin/aiUsagePeriod";

type ModeDraft = { kind: AiUserLimitKind; amount: string };

function draftsFromDetail(detail: AiUserLimitDetail): Record<AiMode, ModeDraft> {
  const draft = (mode: AiMode): ModeDraft => {
    const override = detail.overrides.find((o) => o.mode === mode);
    if (!override) return { kind: "plan", amount: "" };
    return override.kind === "unlimited"
      ? { kind: "unlimited", amount: "" }
      : { kind: "custom", amount: formatLimitInput(override.monthlyUsd) };
  };
  return { text: draft("text"), voice: draft("voice") };
}

/** Show success only when the server changed something; surface no_change and errors honestly. */
function reportMutation(result: AiMutationResult, successMessage: string): boolean {
  if (!result.ok) {
    toast.error(result.error ?? "Couldn't save the change.");
    return false;
  }
  if (result.code === "no_change") {
    toast.info("Nothing changed.");
    return false;
  }
  toast.success(successMessage);
  return true;
}

export default function AiUserLimitDialog({
  userId,
  onOpenChange,
  onChanged,
}: {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<AiUserLimitDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<AiMode, ModeDraft> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyMode, setBusyMode] = useState<AiMode | null>(null);
  const [restoreMode, setRestoreMode] = useState<AiMode | null>(null);
  const [auditKey, setAuditKey] = useState(0);

  const load = useCallback(async (id: string, isCancelled: () => boolean) => {
    try {
      const next = await fetchAiUserLimitDetail(id);
      if (isCancelled()) return;
      setDetail(next);
      setDrafts(draftsFromDetail(next));
      setError(null);
    } catch (err) {
      if (!isCancelled()) setError(err instanceof Error ? err.message : "Couldn't load limits.");
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setDrafts(null);
    setError(null);
    if (!userId) return;
    let cancelled = false;
    void load(userId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

  const afterMutation = async () => {
    if (!userId) return;
    await load(userId, () => false);
    setAuditKey((n) => n + 1);
    onChanged();
  };

  const applyMode = async (mode: AiMode) => {
    if (!userId || !drafts) return;
    const draft = drafts[mode];
    let amount: number | null = null;
    if (draft.kind === "custom") {
      const parsed = parseLimitAmount(draft.amount);
      if (!parsed.ok || parsed.value == null) {
        toast.error(parsed.ok ? "Enter an amount for the custom limit." : parsed.error);
        return;
      }
      amount = parsed.value;
    }
    setBusyMode(mode);
    try {
      const result = await setAiUserLimit(userId, mode, draft.kind, amount);
      reportMutation(result, `${mode === "text" ? "Text" : "Voice"} limit updated.`);
      await afterMutation();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the change.");
    } finally {
      setBusyMode(null);
    }
  };

  const confirmRestore = async () => {
    const mode = restoreMode;
    setRestoreMode(null);
    if (!userId || !mode) return;
    setBusyMode(mode);
    try {
      const result = await restoreAiUserLimit(userId, mode);
      reportMutation(result, `${mode === "text" ? "Text" : "Voice"} limit restored for this month.`);
      await afterMutation();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restore the limit.");
    } finally {
      setBusyMode(null);
    }
  };

  return (
    <>
      <Dialog open={userId !== null} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.user.displayName ?? "AI limits"}</DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.user.email ?? ""} · ${AI_TIER_LABELS[detail.user.tier]} · month ${detail.monthKey} (UTC)`
                : "Per-user monthly AI limits (estimated spend)."}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !detail || !drafts ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="space-y-6">
              {AI_MODES.map((mode) => {
                const limit = detail[mode];
                const draft = drafts[mode];
                const busy = busyMode === mode;
                return (
                  <section key={mode} className="space-y-3 rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold capitalize">{mode}</h3>
                      {limit.exceeded ? <Badge variant="destructive">Exceeded</Badge> : <Badge variant="outline">OK</Badge>}
                    </div>
                    <p className="text-sm">{describeEffectiveLimit(limit)}</p>
                    <p className="text-xs text-muted-foreground">
                      Used {formatUsd(limit.usedUsd)} this month
                      {limit.remainingUsd != null ? ` · ${formatUsd(limit.remainingUsd)} remaining` : ""}
                      {limit.baselineUsd > 0
                        ? ` · ${formatUsd(limit.monthSpendUsd)} total spend, restored from ${formatUsd(limit.baselineUsd)}`
                        : ""}
                    </p>

                    <RadioGroup
                      value={draft.kind}
                      onValueChange={(value) =>
                        setDrafts((prev) =>
                          prev ? { ...prev, [mode]: { ...prev[mode], kind: value as AiUserLimitKind } } : prev,
                        )
                      }
                      className="gap-2"
                      disabled={busy}
                    >
                      {(
                        [
                          ["plan", `Plan default (${AI_TIER_LABELS[detail.user.tier]})`],
                          ["custom", "Custom limit"],
                          ["unlimited", "Unlimited"],
                        ] as const
                      ).map(([value, label]) => (
                        <div key={value} className="flex items-center gap-2">
                          <RadioGroupItem id={`${mode}-${value}`} value={value} />
                          <Label htmlFor={`${mode}-${value}`}>{label}</Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {draft.kind === "custom" ? (
                      <div className="space-y-1">
                        <Label htmlFor={`${mode}-amount`}>Monthly limit (USD)</Label>
                        <Input
                          id={`${mode}-amount`}
                          inputMode="decimal"
                          value={draft.amount}
                          disabled={busy}
                          onChange={(event) =>
                            setDrafts((prev) =>
                              prev ? { ...prev, [mode]: { ...prev[mode], amount: event.target.value } } : prev,
                            )
                          }
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy || limit.usedUsd <= 0}
                        onClick={() => setRestoreMode(mode)}
                      >
                        Restore
                      </Button>
                      <Button type="button" size="sm" disabled={busy} onClick={() => void applyMode(mode)}>
                        {busy ? "Saving…" : "Apply"}
                      </Button>
                    </div>
                  </section>
                );
              })}

              <AiLimitAuditLog userId={detail.user.userId} refreshKey={auditKey} compact />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={restoreMode !== null} onOpenChange={(open) => !open && setRestoreMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {restoreMode} limit?</AlertDialogTitle>
            <AlertDialogDescription>
              The remaining {restoreMode} budget goes back to the full limit for this month. Past usage
              stays in history, and the plan and the other mode are not changed. This is recorded in the
              change history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRestore()}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
