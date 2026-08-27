import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, UserMinus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddSpecialistPopup from "@/components/settings/admin/AddSpecialistPopup";
import {
  adminSpecialistToForm,
  createAdminSpecialist,
  deleteAdminSpecialist,
  fetchAdminSpecialists,
  setSpecialistActive,
  updateAdminSpecialist,
  uploadSpecialistImage,
  type AdminSpecialistFormState,
  type AdminSpecialistRecord,
  type SpecialistActiveFilter,
} from "@/lib/settings/admin/adminSpecialistsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const FILTERS: { id: SpecialistActiveFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export default function AdminSpecialistsTab() {
  const [specialists, setSpecialists] = useState<AdminSpecialistRecord[]>([]);
  const [filter, setFilter] = useState<SpecialistActiveFilter>("all");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editSpecialist, setEditSpecialist] = useState<AdminSpecialistRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const popupOpen = addOpen || editSpecialist !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditSpecialist(null);
  }, []);

  const reload = useCallback(async () => {
    const result = await fetchAdminSpecialists(filter);
    setSpecialists(result);
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load specialists.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleSave = useCallback(
    async (form: AdminSpecialistFormState, imageFile: File | null) => {
      if (busy) return;
      setBusy(true);
      try {
        if (editSpecialist) {
          await updateAdminSpecialist(editSpecialist.specialistId, form);
          if (imageFile) {
            await uploadSpecialistImage(editSpecialist.specialistId, imageFile);
          }
          toast.success("Specialist updated.");
        } else {
          const created = await createAdminSpecialist(form);
          if (imageFile) {
            await uploadSpecialistImage(created.specialistId, imageFile);
          }
          toast.success("Specialist created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save specialist.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editSpecialist, reload],
  );

  const handleToggleActive = useCallback(
    async (specialist: AdminSpecialistRecord) => {
      if (busy) return;
      setBusy(true);
      try {
        await setSpecialistActive(specialist.specialistId, !specialist.isActive);
        await reload();
        toast.success(
          specialist.isActive ? "Specialist deactivated." : "Specialist activated.",
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Couldn't update specialist status.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, reload],
  );

  const handleDelete = useCallback(
    async (specialist: AdminSpecialistRecord) => {
      if (busy) return;
      if (
        !window.confirm(
          `Permanently delete ${specialist.name}? This cannot be undone.`,
        )
      ) {
        return;
      }
      setBusy(true);
      try {
        await deleteAdminSpecialist(specialist.specialistId);
        await reload();
        toast.success("Specialist deleted.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't delete specialist.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, reload],
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading specialists…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={bubbleStyle("Text_heading_3_")}>Specialists</h3>
          <p className="text-sm text-muted-foreground">
            Manage coaches for internal one-on-one booking. Specialists do not need platform
            accounts.
          </p>
        </div>
        <Button
          type="button"
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add specialist
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {specialists.length === 0 ? (
        <div className={cn(bubbleStyle("Group_card_muted_"), "p-4 text-sm text-muted-foreground")}>
          No specialists in this filter. Add a specialist to start scheduling availability.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {specialists.map((specialist) => (
            <div
              key={specialist.specialistId}
              className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {specialist.imageUrl ? (
                    <img
                      src={specialist.imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-full border bg-muted" />
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={bubbleStyle("Text_heading_3_")}>{specialist.name}</h4>
                      <Badge variant={specialist.isActive ? "default" : "secondary"}>
                        {specialist.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{specialist.email}</p>
                    {specialist.timezone ? (
                      <p className="text-xs text-muted-foreground">
                        TZ: {specialist.timezone.replace(/_/g, " ")}
                      </p>
                    ) : null}
                    {specialist.bio ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">{specialist.bio}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${specialist.name}`}
                    onClick={() => setEditSpecialist(specialist)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={
                      specialist.isActive
                        ? `Deactivate ${specialist.name}`
                        : `Activate ${specialist.name}`
                    }
                    onClick={() => void handleToggleActive(specialist)}
                    disabled={busy}
                  >
                    {specialist.isActive ? (
                      <UserMinus className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                  {!specialist.isActive ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${specialist.name}`}
                      onClick={() => void handleDelete(specialist)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddSpecialistPopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editSpecialistId={editSpecialist?.specialistId ?? null}
        initialForm={editSpecialist ? adminSpecialistToForm(editSpecialist) : null}
      />
    </div>
  );
}
