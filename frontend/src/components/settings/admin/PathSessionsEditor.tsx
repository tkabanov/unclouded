import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditPathSessionPopup from "@/components/settings/admin/EditPathSessionPopup";
import {
  adminPathSessionFormFromRecord,
  createAdminPathSession,
  deleteAdminPathSession,
  fetchAdminPathSessions,
  updateAdminPathSession,
  type AdminPathSessionRecord,
} from "@/lib/settings/admin/adminPathSessionsApi";
import type { AdminPathRecord } from "@/lib/settings/admin/adminPathsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export interface PathSessionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path: AdminPathRecord | null;
  onSessionsChanged?: () => void;
}

export default function PathSessionsEditor({
  open,
  onOpenChange,
  path,
  onSessionsChanged,
}: PathSessionsEditorProps) {
  const [sessions, setSessions] = useState<AdminPathSessionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editSession, setEditSession] = useState<AdminPathSessionRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sessionPopupOpen = addOpen || editSession !== null;

  const closeSessionPopup = useCallback(() => {
    setAddOpen(false);
    setEditSession(null);
  }, []);

  const reload = useCallback(async () => {
    if (!path) return;
    const rows = await fetchAdminPathSessions(path.pathId);
    setSessions(rows);
  }, [path]);

  useEffect(() => {
    if (!open || !path) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load path sessions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, path, reload]);

  const handleSave = useCallback(
    async (form: Parameters<typeof createAdminPathSession>[1]) => {
      if (!path || busy) return;
      setBusy(true);
      try {
        if (editSession) {
          await updateAdminPathSession(path.pathId, editSession.sessionId, form);
          toast.success("Session updated.");
        } else {
          await createAdminPathSession(path.pathId, form);
          toast.success("Session created.");
        }
        await reload();
        onSessionsChanged?.();
        closeSessionPopup();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save session.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, closeSessionPopup, editSession, onSessionsChanged, path, reload],
  );

  const handleDelete = useCallback(
    async (session: AdminPathSessionRecord) => {
      if (!path || busy) return;
      setBusy(true);
      try {
        await deleteAdminPathSession(path.pathId, session.sessionId);
        await reload();
        onSessionsChanged?.();
        toast.success("Session deleted.");
      } catch {
        toast.error("Couldn't delete session.");
      } finally {
        setBusy(false);
      }
    },
    [busy, onSessionsChanged, path, reload],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sessions — {path?.name ?? "Path"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading…" : `${sessions.length} session(s)`}
              </p>
              <Button
                type="button"
                size="sm"
                className={bubbleStyle("Button_primary_")}
                disabled={!path || busy}
                onClick={() => setAddOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add session
              </Button>
            </div>

            <div className="grid gap-3">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-2 p-4")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Session {session.index}
                      </p>
                      <h4 className="font-semibold">{session.title}</h4>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {session.microCommitment || session.coachingText}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setEditSession(session)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void handleDelete(session)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.questions.length} reflection question(s)
                  </p>
                </div>
              ))}

              {!loading && sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sessions yet. Add the first session for this path.
                </p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditPathSessionPopup
        open={sessionPopupOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeSessionPopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editSessionId={editSession?.sessionId ?? null}
        initialForm={editSession ? adminPathSessionFormFromRecord(editSession) : null}
      />
    </>
  );
}
