import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddResourcePopup from "@/components/settings/admin/AddResourcePopup";
import AdminDataSourceNotice from "@/components/settings/admin/AdminDataSourceNotice";
import {
  AI_COACHING_MODE_LABELS,
} from "@/lib/enums/coachingMode";
import {
  createAdminResource,
  deleteAdminResource,
  fetchAdminResources,
  updateAdminResource,
  type AdminResourceRecord,
} from "@/lib/settings/admin/adminResourcesApi";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import { getSensitivityLabel } from "@/lib/settings/admin/adminPathsApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function AdminResourcesTab() {
  const { user } = useAuth();
  const [resources, setResources] = useState<AdminResourceRecord[]>([]);
  const [dataSource, setDataSource] = useState<AdminDataSource>("table");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editResource, setEditResource] = useState<AdminResourceRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const popupOpen = addOpen || editResource !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditResource(null);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    const result = await fetchAdminResources(user.id);
    setResources(result.resources);
    setDataSource(result.dataSource);
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

  const handleSave = useCallback(
    async (form: Parameters<typeof createAdminResource>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        if (editResource) {
          await updateAdminResource(user.id, editResource.resourceId, form);
          toast.success("Resource updated.");
        } else {
          await createAdminResource(user.id, form);
          toast.success("Resource created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save resource.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editResource, reload, user],
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
      <div className="text-sm text-muted-foreground">
        Loading resources…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h3
          className={bubbleStyle("Text_heading_3_")}
        >
          Resource library
        </h3>
        <Button
          type="button"
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add resource
        </Button>
      </div>

      <AdminDataSourceNotice source={dataSource} entityLabel="resources" />

      <div
        className="grid gap-4 md:grid-cols-2"
      >
        {resources.map((resource) => (
          <div
            key={resource.resourceId}
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
                {resource.subMode && (
                  <Badge variant="outline">
                    {resource.subMode}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">
                {getSensitivityLabel(resource.sensitivity)}
              </Badge>
              <Badge
                variant={resource.isFree ? "default" : "secondary"}
              >
                <span>
                  {resource.isCrisis
                    ? "Crisis resources always available"
                    : resource.isFree
                      ? "Free"
                      : "Pro"}
                </span>
              </Badge>
            </div>

            <div
              className="flex justify-end gap-2"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setEditResource(resource)}
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
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editResourceId={editResource?.resourceId ?? null}
        initialForm={
          editResource
            ? {
                title: editResource.title,
                content: editResource.content,
                primaryMode: editResource.primaryMode,
                subMode: editResource.subMode,
                sensitivity: editResource.sensitivity,
                isFree: editResource.isFree,
                isCrisis: editResource.isCrisis,
                externalLink: editResource.externalLink ?? "",
              }
            : null
        }
      />
    </div>
  );
}
