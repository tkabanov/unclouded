import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  createManagerDirectReport,
  deleteManagerDirectReport,
  listManagerDirectReports,
  listWorkplaceMembers,
  MANAGER_DIRECT_REPORT_DUPLICATE_MESSAGE,
  type ManagerDirectReportLink,
  type WorkplaceMemberOption,
} from "@/lib/employer/managerDirectReportApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

type AdminManagerDirectReportsPanelProps = {
  workplaceId: string;
  disabled?: boolean;
};

export default function AdminManagerDirectReportsPanel({
  workplaceId,
  disabled = false,
}: AdminManagerDirectReportsPanelProps) {
  const [members, setMembers] = useState<WorkplaceMemberOption[]>([]);
  const [links, setLinks] = useState<ManagerDirectReportLink[]>([]);
  const [managerUserId, setManagerUserId] = useState("");
  const [reportUserId, setReportUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [memberRows, linkRows] = await Promise.all([
      listWorkplaceMembers(workplaceId),
      listManagerDirectReports(workplaceId),
    ]);
    setMembers(memberRows);
    setLinks(linkRows);
  }, [workplaceId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load direct report links.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const managerOptions = members.filter((member) => member.managesATeam);

  const linkedReportIdsForManager = new Set(
    links
      .filter((link) => link.managerUserId === managerUserId)
      .map((link) => link.reportUserId),
  );

  const reportOptions = members.filter(
    (member) =>
      member.userId !== managerUserId && !linkedReportIdsForManager.has(member.userId),
  );

  const handleCreate = async () => {
    if (!managerUserId || !reportUserId || busy) return;

    if (
      links.some(
        (link) =>
          link.managerUserId === managerUserId && link.reportUserId === reportUserId,
      )
    ) {
      toast.error(MANAGER_DIRECT_REPORT_DUPLICATE_MESSAGE);
      return;
    }

    setBusy(true);
    try {
      await createManagerDirectReport({
        workplaceId,
        managerUserId,
        reportUserId,
      });
      setReportUserId("");
      await reload();
      toast.success("Direct report link added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add direct report link.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteManagerDirectReport(linkId);
      await reload();
      toast.success("Direct report link removed.");
    } catch {
      toast.error("Couldn't remove direct report link.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading direct report links…</p>;
  }

  return (
    <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-3 text-sm")}>
      <div className="space-y-1">
        <p className="font-medium text-foreground">Direct report links</p>
        <p className="text-xs text-muted-foreground">
          Manager aggregates use opted-in direct reports only — not the whole workplace.
        </p>
      </div>

      <div className="grid gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Manager</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1.5"
            value={managerUserId}
            disabled={disabled || busy}
            onChange={(event) => {
              setManagerUserId(event.target.value);
              setReportUserId("");
            }}
          >
            <option value="">Select manager…</option>
            {managerOptions.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Direct report</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1.5"
            value={reportUserId}
            disabled={disabled || busy || !managerUserId}
            onChange={(event) => setReportUserId(event.target.value)}
          >
            <option value="">Select report…</option>
            {reportOptions.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || busy || !managerUserId || !reportUserId}
          onClick={() => void handleCreate()}
        >
          Add link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">No direct report links yet.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-start justify-between gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <span>
                {link.managerLabel} → {link.reportLabel}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || busy}
                onClick={() => void handleDelete(link.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
