import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ADMIN_PULSE_DROP_OUTREACH_EMPTY,
  ADMIN_PULSE_DROP_OUTREACH_NOTICE,
  formatPulseDropSummary,
  listPulseDropOutreachCandidates,
  type PulseDropOutreachCandidate,
} from "@/lib/settings/admin/adminPulseDropOutreachApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatFlaggedAt(iso: string | null): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function ModeBadges({ candidate }: { candidate: PulseDropOutreachCandidate }) {
  if (!candidate.griefModeActive && !candidate.recoveryModeActive) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {candidate.griefModeActive ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Grief</span>
      ) : null}
      {candidate.recoveryModeActive ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Recovery</span>
      ) : null}
    </span>
  );
}

/** REQ-05 — pulse drop outreach monitoring for admin. */
export default function AdminOutreachTab() {
  const [candidates, setCandidates] = useState<PulseDropOutreachCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPulseDropOutreachCandidates()
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load pulse drop outreach queue.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading outreach queue…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-2 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>Pulse drop outreach (REQ-05)</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
          {ADMIN_PULSE_DROP_OUTREACH_NOTICE}
        </p>
        <p className="text-2xl font-bold tabular-nums">{candidates.length}</p>
        <p className="text-xs text-muted-foreground">Users flagged for significant pulse drop</p>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_PULSE_DROP_OUTREACH_EMPTY}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Pulse vs baseline</th>
                <th className="px-4 py-3 font-medium">Drop</th>
                <th className="px-4 py-3 font-medium">Modes</th>
                <th className="px-4 py-3 font-medium">Flagged</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.userId} className="border-b border-border/60">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-foreground">
                      {candidate.firstName || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {candidate.email || candidate.userId}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top tabular-nums">
                    {formatPulseDropSummary(candidate.pulseBaseline, candidate.latestPulse)}
                  </td>
                  <td className="px-4 py-3 align-top tabular-nums">
                    {candidate.pulseDropPoints != null ? `−${candidate.pulseDropPoints}` : "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <ModeBadges candidate={candidate} />
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {formatFlaggedAt(candidate.flaggedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
