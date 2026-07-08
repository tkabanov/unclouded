import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AddWorkplacePopup from "@/components/settings/admin/AddWorkplacePopup";
import {
  ADMIN_ADD_WORKPLACE_BTN_BUBBLE_ID,
  ADMIN_TAB_WORKPLACES_BUBBLE_ID,
  ADMIN_WORKPLACES_GRID_BUBBLE_ID,
  ADMIN_WORKPLACES_TITLE_BUBBLE_ID,
  ADMIN_WORKPLACES_TOOLBAR_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  createAdminWorkplace,
  deleteAdminWorkplace,
  fetchAdminWorkplaces,
  type AdminWorkplaceRecord,
} from "@/lib/settings/admin/adminWorkplacesApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function AdminWorkplacesTab() {
  const { user } = useAuth();
  const [workplaces, setWorkplaces] = useState<AdminWorkplaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setWorkplaces(await fetchAdminWorkplaces(user.id));
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

  const handleCreate = useCallback(
    async (form: Parameters<typeof createAdminWorkplace>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await createAdminWorkplace(user.id, form);
        await reload();
        setAddOpen(false);
        toast.success("Workplace created.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't create workplace.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
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

      <div data-bubble-id={ADMIN_WORKPLACES_GRID_BUBBLE_ID} className="grid gap-4 md:grid-cols-2">
        {workplaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workplaces yet.</p>
        ) : (
          workplaces.map((workplace) => (
            <div
              key={workplace.workplaceId}
              className={cn(bubbleStyle("Group_card_muted_"), "flex items-center justify-between gap-3 p-4")}
            >
              <div>
                <h4 className="font-semibold">{workplace.name}</h4>
                <p className="text-sm text-muted-foreground">{workplace.contactEmail}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleDelete(workplace)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <AddWorkplacePopup
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleCreate}
        busy={busy}
      />
    </div>
  );
}
