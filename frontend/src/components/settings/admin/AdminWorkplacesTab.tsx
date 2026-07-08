import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AddWorkplacePopup from "@/components/settings/admin/AddWorkplacePopup";
import AdminDataSourceNotice from "@/components/settings/admin/AdminDataSourceNotice";
import {
  ADMIN_ADD_WORKPLACE_BTN_BUBBLE_ID,
  ADMIN_TAB_WORKPLACES_BUBBLE_ID,
  ADMIN_WORKPLACE_CARD_ACTIONS_BUBBLE_ID,
  ADMIN_WORKPLACE_CARD_TEMPLATE_BUBBLE_ID,
  ADMIN_WORKPLACE_DELETE_BTN_BUBBLE_ID,
  ADMIN_WORKPLACE_EDIT_BTN_BUBBLE_ID,
  ADMIN_WORKPLACE_EMAIL_BUBBLE_ID,
  ADMIN_WORKPLACE_NAME_BUBBLE_ID,
  ADMIN_WORKPLACES_GRID_BUBBLE_ID,
  ADMIN_WORKPLACES_TITLE_BUBBLE_ID,
  ADMIN_WORKPLACES_TOOLBAR_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  createAdminWorkplace,
  deleteAdminWorkplace,
  fetchAdminWorkplaces,
  updateAdminWorkplace,
  type AdminWorkplaceRecord,
} from "@/lib/settings/admin/adminWorkplacesApi";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function AdminWorkplacesTab() {
  const { user } = useAuth();
  const [workplaces, setWorkplaces] = useState<AdminWorkplaceRecord[]>([]);
  const [dataSource, setDataSource] = useState<AdminDataSource>("table");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editWorkplace, setEditWorkplace] = useState<AdminWorkplaceRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const popupOpen = addOpen || editWorkplace !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditWorkplace(null);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    const result = await fetchAdminWorkplaces(user.id);
    setWorkplaces(result.workplaces);
    setDataSource(result.dataSource);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load workplaces.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, user]);

  const handleSave = useCallback(
    async (form: Parameters<typeof createAdminWorkplace>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        if (editWorkplace) {
          await updateAdminWorkplace(user.id, editWorkplace.workplaceId, form);
          toast.success("Workplace updated.");
        } else {
          await createAdminWorkplace(user.id, form);
          toast.success("Workplace created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save workplace.");
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editWorkplace, reload, user],
  );

  const handleDelete = useCallback(
    async (workplace: AdminWorkplaceRecord) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await deleteAdminWorkplace(user.id, workplace.workplaceId);
        await reload();
        toast.success("Workplace deleted.");
      } catch {
        toast.error("Couldn't delete workplace.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  if (loading) {
    return (
      <div data-bubble-id={ADMIN_TAB_WORKPLACES_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading workplaces…
      </div>
    );
  }

  return (
    <div data-bubble-id={ADMIN_TAB_WORKPLACES_BUBBLE_ID} className="flex flex-col gap-4">
      <div
        data-bubble-id={ADMIN_WORKPLACES_TOOLBAR_BUBBLE_ID}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h3 data-bubble-id={ADMIN_WORKPLACES_TITLE_BUBBLE_ID} className={bubbleStyle("Text_heading_3_")}>
          Workplaces
        </h3>
        <Button
          type="button"
          data-bubble-id={ADMIN_ADD_WORKPLACE_BTN_BUBBLE_ID}
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add workplace
        </Button>
      </div>

      <AdminDataSourceNotice source={dataSource} entityLabel="workplaces" />

      <div data-bubble-id={ADMIN_WORKPLACES_GRID_BUBBLE_ID} className="grid gap-4 md:grid-cols-2">
        {workplaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workplaces yet.</p>
        ) : (
          workplaces.map((workplace) => (
            <div
              key={workplace.workplaceId}
              data-bubble-id={ADMIN_WORKPLACE_CARD_TEMPLATE_BUBBLE_ID}
              className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}
            >
              <div>
                <h4 data-bubble-id={ADMIN_WORKPLACE_NAME_BUBBLE_ID} className="font-semibold">
                  {workplace.name}
                </h4>
                <p
                  data-bubble-id={ADMIN_WORKPLACE_EMAIL_BUBBLE_ID}
                  className="text-sm text-muted-foreground"
                >
                  {workplace.contactEmail}
                </p>
              </div>
              <div
                data-bubble-id={ADMIN_WORKPLACE_CARD_ACTIONS_BUBBLE_ID}
                className="flex justify-end gap-2"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-bubble-id={ADMIN_WORKPLACE_EDIT_BTN_BUBBLE_ID}
                  disabled={busy}
                  onClick={() => setEditWorkplace(workplace)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-bubble-id={ADMIN_WORKPLACE_DELETE_BTN_BUBBLE_ID}
                  disabled={busy}
                  onClick={() => void handleDelete(workplace)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddWorkplacePopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editWorkplaceId={editWorkplace?.workplaceId ?? null}
        initialForm={
          editWorkplace
            ? { name: editWorkplace.name, contactEmail: editWorkplace.contactEmail }
            : null
        }
      />
    </div>
  );
}
