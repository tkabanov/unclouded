import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminCancelGroupSession,
  adminCreateGroupSessions,
  listAdminGroupEnrollments,
  listAdminGroupSessions,
  type AdminGroupEnrollmentRow,
  type AdminGroupSessionRow,
} from "@/lib/settings/admin/adminGroupSessionsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminGroupSessionsTab() {
  const [rows, setRows] = useState<AdminGroupSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<AdminGroupEnrollmentRow[]>([]);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60_000)),
  );
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [capacity, setCapacity] = useState("20");
  const [recurrenceWeeks, setRecurrenceWeeks] = useState("0");

  const reload = useCallback(async () => {
    const next = await listAdminGroupSessions();
    setRows(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load group sessions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!expandedId) {
      setEnrollments([]);
      return;
    }
    let cancelled = false;
    listAdminGroupEnrollments(expandedId)
      .then((list) => {
        if (!cancelled) setEnrollments(list);
      })
      .catch(() => {
        if (!cancelled) setEnrollments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [expandedId]);

  const handleCreate = async () => {
    if (creating) return;
    const duration = Number.parseInt(durationMinutes, 10);
    const cap = Number.parseInt(capacity, 10);
    const weeks = Number.parseInt(recurrenceWeeks, 10);
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    const startIso = new Date(startsAt).toISOString();
    if (!Number.isFinite(Date.parse(startIso))) {
      toast.error("Pick a valid start time.");
      return;
    }
    setCreating(true);
    try {
      const result = await adminCreateGroupSessions({
        title: title.trim(),
        description: description.trim(),
        startsAt: startIso,
        durationMinutes: duration,
        capacity: cap,
        recurrenceWeeks: Number.isFinite(weeks) ? weeks : 0,
      });
      toast.success(
        result.sessionIds.length > 1
          ? `Created ${result.sessionIds.length} sessions.`
          : "Group session created.",
      );
      setTitle("");
      setDescription("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create session.");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (sessionId: string) => {
    try {
      await adminCancelGroupSession(sessionId);
      toast.success("Session canceled.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel session.");
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading group sessions…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-3 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>Group coaching sessions</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
          Create catalog sessions with capacity. Users join or waitlist; offers expire after 24
          hours.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Title
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Starts at
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
            Description
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Duration (minutes)
            <Input
              type="number"
              min={15}
              max={240}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Capacity
            <Input
              type="number"
              min={1}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Extra weekly repeats (0–12)
            <Input
              type="number"
              min={0}
              max={12}
              value={recurrenceWeeks}
              onChange={(e) => setRecurrenceWeeks(e.target.value)}
              className="bg-background"
            />
          </label>
        </div>
        <Button type="button" size="sm" disabled={creating} onClick={() => void handleCreate()}>
          {creating ? "Creating…" : "Create session(s)"}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No group sessions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Fill</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="border-b border-border/60">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">{row.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {row.description || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatWhen(row.startsAt)}
                        <div className="text-xs">{row.durationMinutes} min</div>
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        {row.registeredCount}/{row.capacity}
                        {row.waitlistCount > 0 ? (
                          <div className="text-xs text-muted-foreground">
                            +{row.waitlistCount} waitlist
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top capitalize">{row.status}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedId(expanded ? null : row.id)}
                          >
                            {expanded ? "Hide" : "Participants"}
                          </Button>
                          {row.status === "scheduled" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => void handleCancel(row.id)}
                            >
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-border/60 bg-muted/20">
                        <td colSpan={5} className="px-4 py-4">
                          {row.meetLink ? (
                            <a
                              href={row.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="mb-2 inline-block text-sm text-primary underline-offset-2 hover:underline"
                            >
                              Open Google Meet
                            </a>
                          ) : null}
                          {enrollments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
                          ) : (
                            <ul className="divide-y rounded-md border border-border text-xs">
                              {enrollments.map((e) => (
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
                                    {e.claimExpiresAt
                                      ? ` · claim by ${formatWhen(e.claimExpiresAt)}`
                                      : ""}
                                  </span>
                                </li>
                              ))}
                            </ul>
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
    </div>
  );
}
