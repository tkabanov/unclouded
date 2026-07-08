import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddResourcePopup from "@/components/settings/admin/AddResourcePopup";
import {
  ADMIN_ADD_RESOURCE_BTN_BUBBLE_ID,
  ADMIN_RESOURCE_CARD_TEMPLATE_BUBBLE_ID,
  ADMIN_RESOURCES_GRID_BUBBLE_ID,
  ADMIN_RESOURCES_TITLE_BUBBLE_ID,
  ADMIN_RESOURCES_TOOLBAR_BUBBLE_ID,
  ADMIN_TAB_RESOURCES_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  AI_COACHING_MODE_LABELS,
} from "@/lib/enums/coachingMode";
import {
  createAdminResource,
  deleteAdminResource,
  fetchAdminResources,
  type AdminResourceRecord,
} from "@/lib/settings/admin/adminResourcesApi";
import { getSensitivityLabel } from "@/lib/settings/admin/adminPathsApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function AdminResourcesTab() {
  const { user } = useAuth();
  const [resources, setResources] = useState<AdminResourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const rows = await fetchAdminResources(user.id);
    setResources(rows);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load admin resources.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, user]);

  const handleCreate = useCallback(
    async (form: Parameters<typeof createAdminResource>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await createAdminResource(user.id, form);
        await reload();
        setAddOpen(false);
        toast.success("Resource created.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't create resource.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  const handleDelete = useCallback(
    async (resource: AdminResourceRecord) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await deleteAdminResource(user.id, resource.resourceId);
        await reload();
        toast.success("Resource deleted.");
      } catch {
        toast.error("Couldn't delete resource.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  if (loading) {
    return (
      <div data-bubble-id={ADMIN_TAB_RESOURCES_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading resources…
      </div>
    );
  }

  return (
    <div data-bubble-id={ADMIN_TAB_RESOURCES_BUBBLE_ID} className="flex flex-col gap-4">
      <div
        data-bubble-id={ADMIN_RESOURCES_TOOLBAR_BUBBLE_ID}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h3
          data-bubble-id={ADMIN_RESOURCES_TITLE_BUBBLE_ID}
          className={bubbleStyle("Text_heading_3_")}
        >
          Resource library
        </h3>
        <Button
          type="button"
          data-bubble-id={ADMIN_ADD_RESOURCE_BTN_BUBBLE_ID}
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add resource
        </Button>
      </div>

      <div
        data-bubble-id={ADMIN_RESOURCES_GRID_BUBBLE_ID}
        className="grid gap-4 md:grid-cols-2"
      >
        {resources.map((resource) => (
          <div
            key={resource.resourceId}
            data-bubble-id={ADMIN_RESOURCE_CARD_TEMPLATE_BUBBLE_ID}
            data-resource-id={resource.resourceId}
            className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold">{resource.title}</h4>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{resource.content}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {AI_COACHING_MODE_LABELS[resource.primaryMode]}
                </Badge>
                {resource.subMode && <Badge variant="outline">{resource.subMode}</Badge>}
                <Badge variant="outline">{getSensitivityLabel(resource.sensitivity)}</Badge>
                <Badge variant={resource.isFree ? "default" : "secondary"}>
                  {resource.isFree ? "Free" : "Pro"}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => toast.info("Edit opens the add form in a future iteration.")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleDelete(resource)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AddResourcePopup
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleCreate}
        busy={busy}
      />
    </div>
  );
}
