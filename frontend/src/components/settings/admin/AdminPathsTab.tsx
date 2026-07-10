import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddPathPopup from "@/components/settings/admin/AddPathPopup";
import {
  createAdminPath,
  deleteAdminPath,
  fetchAdminPaths,
  getPathModeLabel,
  getPathTierLabel,
  getSensitivityLabel,
  updateAdminPath,
  type AdminPathRecord,
} from "@/lib/settings/admin/adminPathsApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function AdminPathsTab() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<AdminPathRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPath, setEditPath] = useState<AdminPathRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const popupOpen = addOpen || editPath !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditPath(null);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    const rows = await fetchAdminPaths(user.id);
    setPaths(rows);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load admin paths.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, user]);

  const handleSave = useCallback(
    async (form: Parameters<typeof createAdminPath>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        if (editPath) {
          await updateAdminPath(user.id, editPath.pathId, { ...form, slug: editPath.slug });
          toast.success("Path updated.");
        } else {
          await createAdminPath(user.id, form);
          toast.success("Path created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save path.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editPath, reload, user],
  );

  const handleDelete = useCallback(
    async (path: AdminPathRecord) => {
      if (!user || path.isStatic || busy) return;
      setBusy(true);
      try {
        await deleteAdminPath(user.id, path.pathId);
        await reload();
        toast.success("Path deleted.");
      } catch {
        toast.error("Couldn't delete path.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading paths…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h3 className={bubbleStyle("Text_heading_3_")}>
          Guided paths
        </h3>
        <Button
          type="button"
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add path
        </Button>
      </div>

      <div
        className="grid gap-4 md:grid-cols-2"
      >
        {paths.map((path) => (
          <div
            key={path.pathId}
            data-path-id={path.pathId}
            className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold">{path.name}</h4>
                <p
                  className="mt-1 line-clamp-2 text-sm text-muted-foreground"
                >
                  {path.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {getPathTierLabel(path.tier)}
                </Badge>
                <Badge variant="outline">
                  {getPathModeLabel(path.coachingMode)}
                </Badge>
                {path.subMode && (
                  <Badge variant="outline">
                    {path.subMode}
                  </Badge>
                )}
              </div>
            </div>

            <div
              className="text-xs text-muted-foreground"
            >
              <span>
                {getSensitivityLabel(path.sensitivity)}
              </span>
            </div>

            <div
              className="flex justify-end gap-2"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={path.isStatic || busy}
                onClick={() =>
                  setEditPath({
                    ...path,
                  })
                }
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={path.isStatic || busy}
                onClick={() => void handleDelete(path)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AddPathPopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editPathId={editPath?.pathId ?? null}
        initialForm={
          editPath
            ? {
                slug: editPath.slug,
                name: editPath.name,
                description: editPath.description,
                tier: editPath.tier,
                coachingMode: editPath.coachingMode,
                subMode: editPath.subMode,
                sensitivity: editPath.sensitivity,
              }
            : null
        }
      />
    </div>
  );
}
