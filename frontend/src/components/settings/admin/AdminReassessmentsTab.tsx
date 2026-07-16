import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listAssessmentResults,
  listUsersWithAssessmentHistory,
  type AssessmentResultRow,
} from "@/lib/reassessment/assessmentResultApi";
import { TRAJECTORY_LANGUAGE, type TrajectoryType } from "@/lib/reassessment/trajectory";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** US-504 — read-only assessment history per user. */
export default function AdminReassessmentsTab() {
  const [users, setUsers] = useState<
    Array<{ userId: string; firstName: string | null; email: string | null; count: number }>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<AssessmentResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listUsersWithAssessmentHistory()
      .then((rows) => {
        if (!cancelled) setUsers(rows);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) toast.error("Couldn't load assessment history users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    listAssessmentResults(selectedUserId)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) toast.error("Couldn't load assessment rows.");
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading reassessment history…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-1 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>Reassessment results</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
          Read-only assessment history per user (initial + reassessments). US-504.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Users ({users.length})
          </p>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessment history yet.</p>
          ) : (
            <ul className="divide-y rounded-xl border border-border">
              {users.map((user) => {
                const active = user.userId === selectedUserId;
                return (
                  <li key={user.userId}>
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        "h-auto w-full justify-start rounded-none px-4 py-3 text-left",
                        active && "bg-primary/10",
                      )}
                      onClick={() => setSelectedUserId(user.userId)}
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {user.firstName || "User"} · {user.count} assessment
                          {user.count === 1 ? "" : "s"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email || user.userId}
                        </span>
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            History
          </p>
          {!selectedUserId ? (
            <p className="text-sm text-muted-foreground">Select a user to view history.</p>
          ) : loadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {history.map((row) => {
                const traj =
                  row.trajectoryType && row.trajectoryType in TRAJECTORY_LANGUAGE
                    ? TRAJECTORY_LANGUAGE[row.trajectoryType as TrajectoryType]
                    : null;
                return (
                  <li
                    key={row.id}
                    className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {row.isInitial ? "Initial assessment" : "Reassessment"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(row.assessmentDate).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      S {row.stabilityScore?.toFixed(1) ?? "—"} · P{" "}
                      {row.performanceScore?.toFixed(1) ?? "—"} · A{" "}
                      {row.alignmentScore?.toFixed(1) ?? "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Classification: </span>
                      <span className="font-medium">{row.classification || "—"}</span>
                    </p>
                    {traj ? (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Trajectory: </span>
                        {traj}
                      </p>
                    ) : null}
                    {(row.reflectionQ1 ||
                      row.reflectionQ2 ||
                      row.reflectionQ3 ||
                      row.reflectionQ4) && (
                      <div className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                        {row.reflectionQ1 ? <p>Q1: {row.reflectionQ1}</p> : null}
                        {row.reflectionQ2 ? <p>Q2: {row.reflectionQ2}</p> : null}
                        {row.reflectionQ3 ? <p>Q3: {row.reflectionQ3}</p> : null}
                        {row.reflectionQ4 ? <p>Q4: {row.reflectionQ4}</p> : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
