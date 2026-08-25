import { Fragment, useEffect, useState } from "react";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_COACH_BOOKINGS_EMPTY,
  ADMIN_COACH_BOOKINGS_NOTICE,
  adminReassignCoachBookingSpecialist,
  adminSetAssignedCoachEmail,
  formatCoachBookingDeliveryStatus,
  listCoachBookingsForAdmin,
  resolveAdminCoachBriefText,
  type AdminCoachBookingRow,
} from "@/lib/settings/admin/adminCoachBookingsApi";
import {
  fetchAdminSpecialists,
  type AdminSpecialistRecord,
} from "@/lib/settings/admin/adminSpecialistsApi";
import { formatCoachBookingStatusLabel, cancelOneOnOneBooking } from "@/lib/coach/coachBookingApi";
import { coachPostSessionFormUrl } from "@/lib/coach/coachPostSessionApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function isUpcomingConfirmed(row: AdminCoachBookingRow): boolean {
  if (row.status !== "confirmed" || !row.scheduledAt) return false;
  return new Date(row.scheduledAt).getTime() > Date.now();
}

function BriefPanel({
  row,
  specialists,
  onCoachEmailSaved,
  onSpecialistReassigned,
  onCancelled,
}: {
  row: AdminCoachBookingRow;
  specialists: AdminSpecialistRecord[];
  onCoachEmailSaved: (bookingId: string, email: string | null) => void;
  onSpecialistReassigned: (
    bookingId: string,
    specialistId: string,
    specialistName: string | null,
    assignedCoachEmail: string | null,
  ) => void;
  onCancelled: (bookingId: string) => void;
}) {
  const brief = resolveAdminCoachBriefText(row);
  const [coachEmail, setCoachEmail] = useState(row.assignedCoachEmail ?? "");
  const [specialistId, setSpecialistId] = useState(row.specialistId ?? "");
  const [saving, setSaving] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setCoachEmail(row.assignedCoachEmail ?? "");
    setSpecialistId(row.specialistId ?? "");
  }, [row.id, row.assignedCoachEmail, row.specialistId]);

  const handleCopy = async () => {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(brief);
      toast.success("Brief copied to clipboard.");
    } catch {
      toast.error("Could not copy brief.");
    }
  };

  const handleCopyFormLink = async () => {
    if (!row.postSessionToken) {
      toast.error("No post-session form link for this booking.");
      return;
    }
    try {
      await navigator.clipboard.writeText(coachPostSessionFormUrl(row.postSessionToken));
      toast.success("Post-session form link copied.");
    } catch {
      toast.error("Could not copy form link.");
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    const result = await adminSetAssignedCoachEmail({
      bookingId: row.id,
      assignedCoachEmail: coachEmail.trim(),
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const saved = coachEmail.trim() || null;
    onCoachEmailSaved(row.id, saved);
    toast.success(saved ? "Assigned coach email saved." : "Assigned coach email cleared.");
  };

  const handleReassign = async () => {
    if (!specialistId) {
      toast.error("Select a specialist.");
      return;
    }
    setReassigning(true);
    const result = await adminReassignCoachBookingSpecialist({
      bookingId: row.id,
      specialistId,
    });
    setReassigning(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const specialist = specialists.find((entry) => entry.specialistId === specialistId);
    onSpecialistReassigned(
      row.id,
      specialistId,
      specialist?.name ?? null,
      result.assignedCoachEmail,
    );
    if (result.assignedCoachEmail) setCoachEmail(result.assignedCoachEmail);
    toast.success("Specialist reassigned.");
  };

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      const result = await cancelOneOnOneBooking(row.id);
      if (result.status === "blocked") {
        toast.error(result.message);
        return;
      }
      onCancelled(row.id);
      toast.success(
        result.refunded
          ? "Session canceled — credits were refunded (24+ hours before session)."
          : "Session canceled. No auto-refund within 24 hours — use User Detail to adjust credits if needed.",
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Assigned specialist
            <Select value={specialistId || undefined} onValueChange={setSpecialistId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select specialist" />
              </SelectTrigger>
              <SelectContent>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.specialistId} value={specialist.specialistId}>
                    {specialist.name}
                    {!specialist.isActive ? " (inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={reassigning || !specialistId}
            onClick={() => void handleReassign()}
          >
            {reassigning ? "Saving…" : "Reassign"}
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Assigned coach email
            <Input
              type="email"
              value={coachEmail}
              onChange={(event) => setCoachEmail(event.target.value)}
              placeholder="coach@example.com (falls back to COACH_BRIEF_INBOX)"
              className="bg-background"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving}
            onClick={() => void handleSaveEmail()}
          >
            {saving ? "Saving…" : "Save email"}
          </Button>
        </div>
      </div>

      {row.scheduledAt ? (
        <p className="text-xs text-muted-foreground">
          Session: {formatWhen(row.scheduledAt)}
          {row.durationMinutes ? ` · ${row.durationMinutes} min` : null}
          {row.specialistName ? ` · ${row.specialistName}` : null}
        </p>
      ) : null}

      {row.meetLink ? (
        <a
          href={row.meetLink}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Open Google Meet
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">No Meet link yet.</p>
      )}

      {isUpcomingConfirmed(row) ? (
        <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            Exceptional cancel: late cancels (&lt;24h) do not auto-refund. Use User Detail → Manual
            credit adjustment for corrections.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={cancelling}
            onClick={() => void handleCancel()}
          >
            {cancelling ? "Canceling…" : "Cancel session"}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-xs font-medium text-muted-foreground">Post-session notes</p>
        {row.coachSessionNotes?.trim() ? (
          <pre
            className={cn(
              bubbleStyle("Group_card_muted_"),
              "max-h-48 overflow-auto whitespace-pre-wrap p-3 text-sm leading-relaxed",
            )}
          >
            {row.coachSessionNotes.trim()}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">No notes submitted yet.</p>
        )}
        {row.postSessionSubmittedAt ? (
          <p className="text-xs text-muted-foreground">
            Submitted {formatWhen(row.postSessionSubmittedAt)}
            {row.completedAt ? ` · Completed ${formatWhen(row.completedAt)}` : null}
          </p>
        ) : null}
        {row.postSessionToken ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyFormLink()}>
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            Copy post-session form link
          </Button>
        ) : null}
      </div>

      {!brief ? (
        <p className="text-sm text-muted-foreground">
          Kota&apos;s Read is still generating for this booking.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
              <Copy className="mr-2 h-4 w-4" aria-hidden />
              Copy brief
            </Button>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {formatCoachBookingDeliveryStatus(row)}
              {row.kotaReadEmailedAt ? ` · ${formatWhen(row.kotaReadEmailedAt)}` : null}
            </span>
          </div>
          {row.kotaReadEmailDetail?.trim() ? (
            <p className="text-xs text-muted-foreground">{row.kotaReadEmailDetail}</p>
          ) : null}
          <pre
            className={cn(
              bubbleStyle("Group_card_muted_"),
              "max-h-96 overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed",
            )}
          >
            {brief}
          </pre>
        </>
      )}
    </div>
  );
}

/** Block 3.35 — Kota's Read delivery queue for PuP coaches / admins. */
export default function AdminCoachBookingsTab() {
  const [rows, setRows] = useState<AdminCoachBookingRow[]>([]);
  const [specialists, setSpecialists] = useState<AdminSpecialistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listCoachBookingsForAdmin(), fetchAdminSpecialists("all")])
      .then(([bookings, specialistRows]) => {
        if (!cancelled) {
          setRows(bookings);
          setSpecialists(specialistRows);
          if (bookings.length > 0) setExpandedId(bookings[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load coach briefs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading coach briefs…</p>;
  }

  const readyCount = rows.filter((row) => resolveAdminCoachBriefText(row)).length;
  const emailedCount = rows.filter((row) => row.kotaReadEmailedAt).length;

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-2 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>Coach briefs — Kota&apos;s Read (Block 3.35)</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>{ADMIN_COACH_BOOKINGS_NOTICE}</p>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-2xl font-bold tabular-nums">{rows.length}</p>
            <p className="text-xs text-muted-foreground">Bookings</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{readyCount}</p>
            <p className="text-xs text-muted-foreground">Briefs ready</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{emailedCount}</p>
            <p className="text-xs text-muted-foreground">Emailed</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_COACH_BOOKINGS_EMPTY}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Specialist</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Delivery</th>
                <th className="px-4 py-3 font-medium">Brief</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = expandedId === row.id;
                const briefReady = Boolean(resolveAdminCoachBriefText(row));
                return (
                  <Fragment key={row.id}>
                    <tr className="border-b border-border/60">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-foreground">
                          {row.memberFirstName || "Member"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.memberEmail || row.userId}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        <div>{formatWhen(row.scheduledAt ?? row.createdAt)}</div>
                        {row.meetLink ? (
                          <a
                            href={row.meetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline-offset-2 hover:underline"
                          >
                            Meet
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {row.specialistName || row.assignedCoachEmail || "—"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {formatCoachBookingStatusLabel(row.status)}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatCoachBookingDeliveryStatus(row)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(expanded ? null : row.id)}
                        >
                          {expanded ? "Hide" : briefReady ? "View" : "Waiting"}
                        </Button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-border/60 bg-muted/20">
                        <td colSpan={6} className="px-4 py-4">
                          <BriefPanel
                            row={row}
                            specialists={specialists}
                            onCoachEmailSaved={(bookingId, email) => {
                              setRows((prev) =>
                                prev.map((entry) =>
                                  entry.id === bookingId
                                    ? { ...entry, assignedCoachEmail: email }
                                    : entry,
                                ),
                              );
                            }}
                            onSpecialistReassigned={(
                              bookingId,
                              nextSpecialistId,
                              specialistName,
                              assignedCoachEmail,
                            ) => {
                              setRows((prev) =>
                                prev.map((entry) =>
                                  entry.id === bookingId
                                    ? {
                                        ...entry,
                                        specialistId: nextSpecialistId,
                                        specialistName,
                                        assignedCoachEmail,
                                      }
                                    : entry,
                                ),
                              );
                            }}
                            onCancelled={(bookingId) => {
                              setRows((prev) =>
                                prev.map((entry) =>
                                  entry.id === bookingId
                                    ? { ...entry, status: "cancelled" }
                                    : entry,
                                ),
                              );
                            }}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
