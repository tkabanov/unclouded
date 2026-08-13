import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildWorkplaceJoinUrl,
  isValidEnrollmentCodeFormat,
  normalizeEnrollmentCode,
} from "@/lib/workplace/enrollmentCodeFormat";
import {
  createWorkplaceEnrollmentCode,
  deactivateWorkplaceEnrollmentCode,
  fetchWorkplaceEnrollmentCodes,
  type WorkplaceEnrollmentCode,
  type WorkplaceEnrollmentSummary,
} from "@/lib/workplace/workplaceEnrollmentApi";
import { formatEnrollmentSeatLine } from "@/lib/workplace/workplaceSeatLimits";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

type WorkplaceEnrollmentCodesPanelProps = {
  workplaceId: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  /** Optional overrides when parent already loaded org contract fields. */
  billingModel?: string | null;
  maxSeats?: number | null;
  seatCount?: number | null;
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
  billingModel: billingModelProp = null,
  maxSeats: maxSeatsProp = null,
  seatCount: seatCountProp = null,
}: WorkplaceEnrollmentCodesPanelProps) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [workplace, setWorkplace] = useState<WorkplaceEnrollmentSummary | null>(null);
  const [codes, setCodes] = useState<WorkplaceEnrollmentCode[]>([]);
  const [customCode, setCustomCode] = useState("");
  const [showCustom, setShowCustom] = useState(false);

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

  const handleCreate = async (code?: string) => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      await createWorkplaceEnrollmentCode(workplaceId, code);
      setCustomCode("");
      setShowCustom(false);
      await reload();
      toast.success("New enrollment code created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create code.");
    } finally {
      setBusy(false);
    }
  };

  const handleAssignCustom = async () => {
    const normalized = normalizeEnrollmentCode(customCode);
    if (!isValidEnrollmentCodeFormat(normalized)) {
      toast.error("Custom codes must be 6–8 characters (A–Z, 0–9, optional single hyphen).");
      return;
    }
    await handleCreate(normalized);
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

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Couldn't copy ${label.toLowerCase()}.`);
    }
  };

  const activeCodes = codes.filter((row) => row.isActive);
  const primaryActive = activeCodes[0];

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
              {formatEnrollmentSeatLine({
                billingModel: billingModelProp ?? workplace.billingModel,
                seatCount:
                  typeof seatCountProp === "number" ? seatCountProp : workplace.seatCount,
                maxSeats:
                  maxSeatsProp !== undefined && maxSeatsProp !== null
                    ? maxSeatsProp
                    : workplace.maxSeats ?? null,
                activeSeats: workplace.activeSeats,
              })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={disabled || loading} onClick={() => void reload()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => setShowCustom((v) => !v)}
          >
            Assign code
          </Button>
          <Button
            type="button"
            size="sm"
            className={bubbleStyle("Button_primary_")}
            disabled={disabled || busy}
            onClick={() => void handleCreate()}
          >
            {busy ? "Creating…" : "Generate code"}
          </Button>
        </div>
      </div>

      {showCustom ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid min-w-[12rem] flex-1 gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="custom-enroll-code">
              Custom code (6–8 chars)
            </label>
            <Input
              id="custom-enroll-code"
              className="font-mono uppercase"
              value={customCode}
              placeholder="ACME26"
              onChange={(event) => setCustomCode(event.target.value)}
            />
          </div>
          <Button type="button" size="sm" disabled={disabled || busy} onClick={() => void handleAssignCustom()}>
            Save code
          </Button>
        </div>
      ) : null}

      {primaryActive ? (
        <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          {activeCodes.map((activeCode) => {
            const joinUrl = buildWorkplaceJoinUrl(window.location.origin, activeCode.code);
            return (
              <div key={activeCode.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 py-2 last:border-0 last:pb-0 first:pt-0">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Active code
                  </p>
                  <p className="font-mono font-semibold">{activeCode.code}</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{joinUrl}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCopy(activeCode.code, "Code")}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy code
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCopy(joinUrl, "Join link")}
                  >
                    <Link2 className="mr-1 h-3.5 w-3.5" />
                    Copy join link
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active code — create one for employees to redeem.</p>
      )}

      {codes.length > 0 ? (
        <ul className="divide-y rounded-md border text-xs">
          {codes.slice(0, compact ? 4 : 12).map((row) => (
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
