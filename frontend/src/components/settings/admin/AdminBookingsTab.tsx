import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  formatAdminCreditStatus,
  formatAdminDisplayStatus,
  formatAdminPostSessionFormStatus,
  listAdminCoachingBookings,
  type AdminBookingDisplayStatus,
  type AdminBookingRow,
} from "@/lib/settings/admin/adminBookingsApi";
import {
  adminReassignCoachBookingSpecialist,
  adminSetAssignedCoachEmail,
  formatCoachBookingDeliveryStatus,
  resolveAdminCoachBriefText,
} from "@/lib/settings/admin/adminCoachBookingsApi";
import {
  adminCancelGroupSession,
  listAdminGroupEnrollments,
  type AdminGroupEnrollmentRow,
} from "@/lib/settings/admin/adminGroupSessionsApi";
import {
  fetchAdminSpecialists,
  type AdminSpecialistRecord,
} from "@/lib/settings/admin/adminSpecialistsApi";
import { cancelOneOnOneBooking } from "@/lib/coach/coachBookingApi";
import { coachPostSessionFormUrl } from "@/lib/coach/coachPostSessionApi";
import AdminGroupCatalogPanel from "@/components/settings/admin/AdminGroupCatalogPanel";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function toLocalDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isUpcomingConfirmed(row: AdminBookingRow): boolean {
  if (row.rowKind !== "oneOnOne" || row.status !== "confirmed" || !row.startsAt) return false;
  return new Date(row.startsAt).getTime() > Date.now();
}

function OneOnOneExpand({
  row,
  specialists,
  onUpdated,
}: {
  row: AdminBookingRow;
  specialists: AdminSpecialistRecord[];
  onUpdated: () => void;
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

  const handleCopyBrief = async () => {
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
    toast.success(coachEmail.trim() ? "Assigned coach email saved." : "Assigned coach email cleared.");
    onUpdated();
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
    if (result.assignedCoachEmail) setCoachEmail(result.assignedCoachEmail);
    toast.success("Specialist reassigned.");
    if (result.sideEffects && !result.sideEffects.ok) {
      toast.warning(
        result.sideEffects.detail?.trim() ||
          "Coach updated in the database, but Calendar/email notifications failed.",
      );
    }
    onUpdated();
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
      toast.success(
        result.refunded
          ? "Session canceled — credits were refunded (24+ hours before session)."
          : "Session canceled. No auto-refund within 24 hours — use User Detail to adjust credits if needed.",
      );
      onUpdated();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <Link to={`/admin/users/${row.userId}`}>Adjust credits (User Detail)</Link>
        </Button>
      </div>

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
              placeholder="coach@example.com"
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
            Exceptional cancel: late cancels (&lt;24h) do not auto-refund. Use User Detail for credit
            adjustments.
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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Post-session notes</p>
          {row.rowKind === "oneOnOne" ? (
            <p className="text-xs text-muted-foreground">
              Form: {formatAdminPostSessionFormStatus(row.postSessionFormStatus)}
            </p>
          ) : null}
        </div>
        {row.notes?.trim() ? (
          <pre
            className={cn(
              bubbleStyle("Group_card_muted_"),
              "max-h-48 overflow-auto whitespace-pre-wrap p-3 text-sm leading-relaxed",
            )}
          >
            {row.notes.trim()}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">No notes submitted yet.</p>
        )}
        {row.postSessionToken ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyFormLink()}>
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            Copy post-session form link
          </Button>
        ) : null}
      </div>

      {!brief ? (
        <p className="text-sm text-muted-foreground">Kota&apos;s Read is still generating for this booking.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyBrief()}>
              <Copy className="mr-2 h-4 w-4" aria-hidden />
              Copy brief
            </Button>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {formatCoachBookingDeliveryStatus({
                id: row.id,
                userId: row.userId,
                scheduledAt: row.startsAt,
                status: row.status,
                kotaRead: row.kotaRead,
                kotaReadJson: row.kotaReadJson,
                assignedCoachEmail: row.assignedCoachEmail,
                specialistId: row.specialistId,
                meetLink: row.meetLink,
                durationMinutes: row.durationMinutes,
                kotaReadEmailedAt: row.kotaReadEmailedAt,
                kotaReadEmailDetail: row.kotaReadEmailDetail,
                createdAt: row.createdAt,
                coachSessionNotes: row.notes,
                postSessionSubmittedAt: row.postSessionSubmittedAt,
                completedAt: row.completedAt,
                postSessionToken: row.postSessionToken,
                memberFirstName: row.memberFirstName,
                memberEmail: row.memberEmail,
                specialistName: row.specialistName,
              })}
              {row.kotaReadEmailedAt ? ` · ${formatWhen(row.kotaReadEmailedAt)}` : null}
            </span>
          </div>
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

function GroupExpand({
  row,
  onUpdated,
}: {
  row: AdminBookingRow;
  onUpdated: () => void;
}) {
  const [participants, setParticipants] = useState<AdminGroupEnrollmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!row.sessionId) {
      setParticipants([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listAdminGroupEnrollments(row.sessionId)
      .then((list) => {
        if (!cancelled) setParticipants(list);
      })
      .catch(() => {
        if (!cancelled) setParticipants([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row.sessionId]);

  const handleCancelSession = async () => {
    if (!row.sessionId || cancelling) return;
    if (!window.confirm("Cancel this entire group session and all active enrollments?")) return;
    setCancelling(true);
    try {
      await adminCancelGroupSession(row.sessionId);
      toast.success("Group session canceled.");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel session.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">{row.sessionTitle || "Group session"}</p>
        <p className="text-xs text-muted-foreground">
          Enrollment: {row.status}
          {row.claimExpiresAt ? ` · claim by ${formatWhen(row.claimExpiresAt)}` : ""}
          {row.registeredCount != null && row.capacity != null
            ? ` · fill ${row.registeredCount}/${row.capacity}`
            : ""}
        </p>
      </div>

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

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <Link to={`/admin/users/${row.userId}`}>Open user</Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive"
          disabled={cancelling || !row.sessionId}
          onClick={() => void handleCancelSession()}
        >
          {cancelling ? "Canceling…" : "Cancel group session"}
        </Button>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-xs font-medium text-muted-foreground">Participants</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments yet.</p>
        ) : (
          <ul className="divide-y rounded-md border border-border text-xs">
            {participants.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span>
                  {e.memberFirstName || "Member"}
                  {e.memberEmail ? ` · ${e.memberEmail}` : ""}
                </span>
                <span className="text-muted-foreground capitalize">
                  {e.status}
                  {e.claimExpiresAt ? ` · claim by ${formatWhen(e.claimExpiresAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AdminBookingsTab() {
  const [rows, setRows] = useState<AdminBookingRow[]>([]);
  const [specialists, setSpecialists] = useState<AdminSpecialistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const [userQuery, setUserQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [specialistId, setSpecialistId] = useState<string>("");
  const [sessionType, setSessionType] = useState<"oneOnOne" | "group" | "">("");
  const [status, setStatus] = useState<AdminBookingDisplayStatus | "">("");

  const reload = useCallback(async () => {
    const fromIso = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : null;
    const toIso = toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : null;
    const next = await listAdminCoachingBookings({
      from: fromIso,
      to: toIso,
      userQuery: userQuery.trim() || null,
      specialistId: specialistId || null,
      sessionType,
      status,
      limit: 100,
    });
    setRows(next);
  }, [fromDate, toDate, userQuery, specialistId, sessionType, status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([reload(), fetchAdminSpecialists("all")])
      .then(([, specialistRows]) => {
        if (!cancelled) setSpecialists(specialistRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load bookings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Initial load only — Apply button reloads with filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = async () => {
    setLoading(true);
    try {
      await reload();
    } catch {
      toast.error("Couldn't load bookings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-3 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>Bookings</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
          Centralized view of one-on-one and group enrollments. Status labels map to underlying DB
          values (e.g. confirmed → Scheduled). Exceptional credit adjustments live on User Detail.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            User
            <Input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Name or email"
              className="bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Specialist
            <Select
              value={specialistId || "all"}
              onValueChange={(v) => setSpecialistId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {specialists.map((s) => (
                  <SelectItem key={s.specialistId} value={s.specialistId}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Session type
            <Select
              value={sessionType || "all"}
              onValueChange={(v) =>
                setSessionType(v === "all" ? "" : (v as "oneOnOne" | "group"))
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="oneOnOne">One-on-One</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Status
            <Select
              value={status || "all"}
              onValueChange={(v) =>
                setStatus(v === "all" ? "" : (v as AdminBookingDisplayStatus))
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void handleApply()}>
            Apply filters
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setUserQuery("");
              setFromDate("");
              setToDate("");
              setSpecialistId("");
              setSessionType("");
              setStatus("");
              setLoading(true);
              void listAdminCoachingBookings({ limit: 100 })
                .then(setRows)
                .catch(() => toast.error("Couldn't load bookings."))
                .finally(() => setLoading(false));
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setShowCatalog((v) => !v)}
          >
            {showCatalog ? "Hide group catalog" : "Group catalog"}
          </Button>
        </div>
      </div>

      {showCatalog ? <AdminGroupCatalogPanel /> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading bookings…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Specialist</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Credit</th>
                <th className="px-4 py-3 font-medium">Meet</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <Fragment key={`${row.rowKind}-${row.id}`}>
                    <tr className="border-b border-border/60">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">{row.memberFirstName || "Member"}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.memberEmail || row.userId}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.rowKind === "oneOnOne" ? "One-on-One" : "Group"}
                        {row.sessionTitle ? (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {row.sessionTitle}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {row.specialistName || row.assignedCoachEmail || "—"}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatWhen(row.startsAt)}
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums text-muted-foreground">
                        {row.durationMinutes != null ? `${row.durationMinutes}m` : "—"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span>{formatAdminDisplayStatus(row.displayStatus)}</span>
                          {row.rowKind === "oneOnOne" ? (
                            <span className="text-xs text-muted-foreground">
                              Form: {formatAdminPostSessionFormStatus(row.postSessionFormStatus)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatAdminCreditStatus(row.creditStatus)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.meetLink ? (
                          <a
                            href={row.meetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline-offset-2 hover:underline"
                          >
                            Meet
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(expanded ? null : row.id)}
                        >
                          {expanded ? "Hide" : "Open"}
                        </Button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-border/60 bg-muted/20">
                        <td colSpan={9} className="px-4 py-4">
                          {row.rowKind === "oneOnOne" ? (
                            <OneOnOneExpand
                              row={row}
                              specialists={specialists}
                              onUpdated={() => void reload()}
                            />
                          ) : (
                            <GroupExpand row={row} onUpdated={() => void reload()} />
                          )}
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

      {!fromDate && !toDate ? (
        <p className="text-[11px] text-muted-foreground">
          Tip: default range is unrestricted (latest {toLocalDateInput(new Date())} first). Use date
          filters to narrow.
        </p>
      ) : null}
    </div>
  );
}
