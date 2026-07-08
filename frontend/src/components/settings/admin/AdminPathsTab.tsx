import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddPathPopup from "@/components/settings/admin/AddPathPopup";
import {
  ADMIN_ADD_PATH_BTN_BUBBLE_ID,
  ADMIN_PATH_CARD_ACTIONS_BUBBLE_ID,
  ADMIN_PATH_CARD_TEMPLATE_BUBBLE_ID,
  ADMIN_PATH_DELETE_BTN_BUBBLE_ID,
  ADMIN_PATH_DESC_BUBBLE_ID,
  ADMIN_PATH_EDIT_BTN_BUBBLE_ID,
  ADMIN_PATH_MODE_BADGE_BUBBLE_ID,
  ADMIN_PATH_SENSITIVITY_BUBBLE_ID,
  ADMIN_PATH_SENSITIVITY_ROW_BUBBLE_ID,
  ADMIN_PATH_SUB_BADGE_BUBBLE_ID,
  ADMIN_PATH_TIER_BADGE_BUBBLE_ID,
  ADMIN_PATHS_GRID_BUBBLE_ID,
  ADMIN_PATHS_TITLE_BUBBLE_ID,
  ADMIN_PATHS_TOOLBAR_BUBBLE_ID,
  ADMIN_TAB_PATHS_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  createAdminPath,
  deleteAdminPath,
  fetchAdminPaths,
  getPathModeLabel,
  getPathTierLabel,
  getSensitivityLabel,
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
  const [busy, setBusy] = useState(false);

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

  const handleCreate = useCallback(
    async (form: Parameters<typeof createAdminPath>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await createAdminPath(user.id, form);
        await reload();
        setAddOpen(false);
        toast.success("Path created.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't create path.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
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
      <div data-bubble-id={ADMIN_TAB_PATHS_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading paths…
      </div>
    );
  }

  return (
    <div data-bubble-id={ADMIN_TAB_PATHS_BUBBLE_ID} className="flex flex-col gap-4">
      <div
        data-bubble-id={ADMIN_PATHS_TOOLBAR_BUBBLE_ID}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h3 data-bubble-id={ADMIN_PATHS_TITLE_BUBBLE_ID} className={bubbleStyle("Text_heading_3_")}>
          Guided paths
        </h3>
        <Button
          type="button"
          data-bubble-id={ADMIN_ADD_PATH_BTN_BUBBLE_ID}
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add path
        </Button>
      </div>

      <div
        data-bubble-id={ADMIN_PATHS_GRID_BUBBLE_ID}
        className="grid gap-4 md:grid-cols-2"
      >
        {paths.map((path) => (
          <div
            key={path.pathId}
            data-bubble-id={ADMIN_PATH_CARD_TEMPLATE_BUBBLE_ID}
            data-path-id={path.pathId}
            className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold">{path.name}</h4>
                <p
                  data-bubble-id={ADMIN_PATH_DESC_BUBBLE_ID}
                  className="mt-1 line-clamp-2 text-sm text-muted-foreground"
                >
                  {path.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge data-bubble-id={ADMIN_PATH_TIER_BADGE_BUBBLE_ID} variant="secondary">
                  {getPathTierLabel(path.tier)}
                </Badge>
                <Badge data-bubble-id={ADMIN_PATH_MODE_BADGE_BUBBLE_ID} variant="outline">
                  {getPathModeLabel(path.coachingMode)}
                </Badge>
                {path.subMode && (
                  <Badge data-bubble-id={ADMIN_PATH_SUB_BADGE_BUBBLE_ID} variant="outline">
                    {path.subMode}
                  </Badge>
                )}
              </div>
            </div>

            <div
              data-bubble-id={ADMIN_PATH_SENSITIVITY_ROW_BUBBLE_ID}
              className="text-xs text-muted-foreground"
            >
              <span data-bubble-id={ADMIN_PATH_SENSITIVITY_BUBBLE_ID}>
                {getSensitivityLabel(path.sensitivity)}
              </span>
            </div>

            <div
              data-bubble-id={ADMIN_PATH_CARD_ACTIONS_BUBBLE_ID}
              className="flex justify-end gap-2"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-bubble-id={ADMIN_PATH_EDIT_BTN_BUBBLE_ID}
                disabled={path.isStatic}
                onClick={() => toast.info("Edit opens the add form in a future iteration.")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-bubble-id={ADMIN_PATH_DELETE_BTN_BUBBLE_ID}
                disabled={path.isStatic || busy}
                onClick={() => void handleDelete(path)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AddPathPopup open={addOpen} onOpenChange={setAddOpen} onSubmit={handleCreate} busy={busy} />
    </div>
  );
}
