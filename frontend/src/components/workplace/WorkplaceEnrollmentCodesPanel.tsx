import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  createWorkplaceEnrollmentCode,
  deactivateWorkplaceEnrollmentCode,
  fetchWorkplaceEnrollmentCodes,
  type WorkplaceEnrollmentCode,
  type WorkplaceEnrollmentSummary,
} from "@/lib/workplace/workplaceEnrollmentApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

type WorkplaceEnrollmentCodesPanelProps = {
  workplaceId: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

function formatCodeDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function WorkplaceEnrollmentCodesPanel({
  workplaceId,
  disabled = false,
  compact = false,
  className,
}: WorkplaceEnrollmentCodesPanelProps) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [workplace, setWorkplace] = useState<WorkplaceEnrollmentSummary | null>(null);
  const [codes, setCodes] = useState<WorkplaceEnrollmentCode[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchWorkplaceEnrollmentCodes(workplaceId);
      setWorkplace(result.workplace);
      setCodes(result.codes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load enrollment codes.");
    } finally {
      setLoading(false);
    }
  }, [workplaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async () => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      await createWorkplaceEnrollmentCode(workplaceId);
      await reload();
      toast.success("New enrollment code created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create code.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = async (codeId: string) => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const next = await deactivateWorkplaceEnrollmentCode(workplaceId, codeId);
      setCodes(next);
      await reload();
      toast.success("Enrollment code deactivated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't deactivate code.");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied.");
    } catch {
      toast.error("Couldn't copy code.");
    }
  };

  const activeCode = codes.find((row) => row.isActive);

  return (
    <div
      className={cn(
        bubbleStyle("Group_card_muted_"),
        "flex flex-col gap-3 p-4",
        compact && "p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Enrollment codes</h4>
          {workplace ? (
            <p className="text-xs text-muted-foreground">
              Seats: {workplace.activeSeats} / {workplace.seatCount} used
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={disabled || loading} onClick={() => void reload()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            size="sm"
            className={bubbleStyle("Button_primary_")}
            disabled={disabled || busy}
            onClick={() => void handleCreate()}
          >
            {busy ? "Creating…" : "New code"}
          </Button>
        </div>
      </div>

      {activeCode ? (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active code</p>
              <p className="font-mono font-semibold">{activeCode.code}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy(activeCode.code)}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active code — create one for employees to redeem.</p>
      )}

      {codes.length > 0 ? (
        <ul className="divide-y rounded-md border text-xs">
          {codes.slice(0, compact ? 4 : 8).map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div>
                <span className="font-mono">{row.code}</span>
                <span className="ml-2 text-muted-foreground">
                  {row.isActive ? "Active" : "Inactive"} · {formatCodeDate(row.createdAt)}
                </span>
              </div>
              {row.isActive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled || busy}
                  onClick={() => void handleDeactivate(row.id)}
                >
                  Deactivate
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
