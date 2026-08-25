import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cancelGroupEnrollment,
  claimGroupOffer,
  formatGroupEnrollmentStatus,
  joinGroupSession,
  listMyGroupEnrollments,
  listUpcomingGroupSessions,
  seatsLeft,
  type MyGroupEnrollment,
  type UpcomingGroupSession,
} from "@/lib/coach/groupCoachingApi";

type GroupCoachingPanelProps = {
  canJoin: boolean;
  locked: boolean;
  onPremiumRequired: () => void;
};

export default function GroupCoachingPanel({
  canJoin,
  locked,
  onPremiumRequired,
}: GroupCoachingPanelProps) {
  const [sessions, setSessions] = useState<UpcomingGroupSession[]>([]);
  const [history, setHistory] = useState<MyGroupEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!canJoin) {
      setSessions([]);
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      const [upcoming, mine] = await Promise.all([
        listUpcomingGroupSessions(),
        listMyGroupEnrollments(),
      ]);
      setSessions(upcoming);
      setHistory(mine);
    } catch {
      toast.error("Couldn't load group sessions.");
      setSessions([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [canJoin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runAction = async (
    sessionId: string,
    action: "join" | "waitlist" | "cancel" | "claim",
  ) => {
    if (!canJoin) {
      onPremiumRequired();
      return;
    }
    setBusyId(sessionId);
    try {
      let result;
      if (action === "cancel") result = await cancelGroupEnrollment(sessionId);
      else if (action === "claim") result = await claimGroupOffer(sessionId);
      else result = await joinGroupSession(sessionId);

      if (result.status === "blocked") {
        if (result.code === "upgrade_required") onPremiumRequired();
        else toast.error(result.message);
        await reload();
        return;
      }

      if (action === "cancel") toast.success("Enrollment canceled.");
      else if (action === "claim") toast.success("Spot claimed — you're registered.");
      else if (result.enrollmentStatus === "waitlisted") {
        toast.success("You're on the waitlist. We'll email you if a spot opens.");
      } else {
        toast.success("You're registered for this group session.");
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  if (locked) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full justify-between"
        onClick={onPremiumRequired}
      >
        <span>Browse group sessions</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Pro</span>
      </Button>
    );
  }

  if (!canJoin) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div>
        <p className="text-sm font-medium">Group coaching</p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          One group session per calendar month. Join if seats are open, or waitlist when full
          (24-hour claim window when promoted).
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No upcoming group sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => {
            const left = seatsLeft(session);
            const mine = session.myEnrollmentStatus;
            const busy = busyId === session.id;
            return (
              <li
                key={session.id}
                className="flex flex-col gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{session.title}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(session.startsAt), "MMM d · HH:mm")} ·{" "}
                      {session.durationMinutes}m
                    </p>
                    {session.description ? (
                      <p className="mt-1 line-clamp-2 text-muted-foreground">
                        {session.description}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="secondary" className="font-normal">
                    {left > 0 ? `${left} seat${left === 1 ? "" : "s"} left` : "Full"}
                  </Badge>
                </div>
                {mine ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">
                      {formatGroupEnrollmentStatus(mine)}
                      {mine === "offered" && session.myClaimExpiresAt
                        ? ` · claim by ${format(new Date(session.myClaimExpiresAt), "MMM d HH:mm")}`
                        : ""}
                    </span>
                    {mine === "offered" ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-7"
                        disabled={busy}
                        onClick={() => void runAction(session.id, "claim")}
                      >
                        Claim spot
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-muted-foreground"
                      disabled={busy}
                      onClick={() => void runAction(session.id, "cancel")}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 w-full"
                    disabled={busy}
                    onClick={() => void runAction(session.id, left > 0 ? "join" : "waitlist")}
                  >
                    {busy ? "Working…" : left > 0 ? "Join session" : "Join waitlist"}
                  </Button>
                )}
                {mine === "registered" && session.meetLink ? (
                  <a
                    href={session.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Join Meet
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {history.length > 0 ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs font-medium text-muted-foreground">Your group sessions</p>
          <ul className="space-y-2">
            {history.slice(0, 8).map((row) => (
              <li
                key={row.enrollmentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-xs"
              >
                <span>
                  {row.title} · {format(new Date(row.startsAt), "MMM d · HH:mm")}
                </span>
                <Badge variant="secondary" className="font-normal">
                  {formatGroupEnrollmentStatus(row.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
