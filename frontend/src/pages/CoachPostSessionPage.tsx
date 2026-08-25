import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCoachPostSessionWhen,
  peekCoachPostSession,
  submitCoachPostSession,
  type CoachPostSessionPeek,
} from "@/lib/coach/coachPostSessionApi";

/**
 * Public post-session form: /coach-session/:token
 * No login required — token identifies the booking.
 */
export default function CoachPostSessionPage() {
  const { token: rawToken } = useParams<{ token: string }>();
  const token = decodeURIComponent(rawToken ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CoachPostSessionPeek | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reload = useCallback(async () => {
    if (!token) {
      setError("Session not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await peekCoachPostSession(token);
    if (result.ok !== true) {
      setSession(null);
      setError(result.error ?? "Session not found.");
      setLoading(false);
      return;
    }
    setSession(result);
    if (result.alreadySubmitted) {
      setSubmitted(true);
      if (result.notes) setNotes(result.notes);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSubmit = async () => {
    if (!token || submitting || submitted) return;
    const trimmed = notes.trim();
    if (!trimmed) {
      toast.error("Please add session notes before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitCoachPostSession(token, trimmed);
      if (result.ok !== true) {
        toast.error(result.error ?? "Could not submit session notes.");
        return;
      }
      setSubmitted(true);
      toast.success(
        result.code === "already_submitted"
          ? "Notes were already submitted for this session."
          : "Session notes submitted. Thank you!",
      );
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  const whenLabel = session
    ? formatCoachPostSessionWhen(session.scheduledAt, session.durationMinutes)
    : null;
  const memberLabel = session?.memberFirstName?.trim() || "Member";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Post-session notes</h1>
        <p className="text-sm text-muted-foreground">
          Submit coaching notes after your Uncloud360 1:1 session. No account login is required.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading session…</p>
      ) : error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : session ? (
        <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Member: </span>
              {memberLabel}
            </p>
            <p>
              <span className="text-muted-foreground">When: </span>
              {whenLabel}
            </p>
          </div>

          {submitted ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">
                {session.alreadySubmitted || session.submittedAt
                  ? "Notes submitted — thank you."
                  : "Notes submitted — thank you."}
              </p>
              {session.submittedAt ? (
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(session.submittedAt).toLocaleString()}
                </p>
              ) : null}
              {notes.trim() ? (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                  {notes}
                </pre>
              ) : null}
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">Session notes</span>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What was covered, key insights, and any follow-up for the member…"
                  rows={8}
                  maxLength={8000}
                  disabled={submitting}
                />
              </label>
              <Button
                type="button"
                className="w-full"
                disabled={submitting || !notes.trim()}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Submitting…" : "Submit session notes"}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </main>
  );
}
