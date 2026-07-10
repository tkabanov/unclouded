import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  emptyAdminWorkplaceForm,
  type AdminWorkplaceFormState,
} from "@/lib/settings/admin/adminWorkplacesApi";
import { bubbleStyle } from "@/styles";

export interface AddWorkplacePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminWorkplaceFormState) => Promise<void>;
  busy?: boolean;
  editWorkplaceId?: string | null;
  initialForm?: AdminWorkplaceFormState | null;
}

export default function AddWorkplacePopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editWorkplaceId = null,
  initialForm = null,
}: AddWorkplacePopupProps) {
  const [form, setForm] = useState<AdminWorkplaceFormState>(emptyAdminWorkplaceForm());
  const isEdit = Boolean(editWorkplaceId);

  useEffect(() => {
    if (open) setForm(initialForm ?? emptyAdminWorkplaceForm());
  }, [open, initialForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit workplace" : "Add workplace"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-workplace-name">Workplace name</Label>
            <Input
              id="add-workplace-name"
              className={bubbleStyle("Input_default_")}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-workplace-email">Contact email</Label>
            <Input
              id="add-workplace-email"
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, contactEmail: event.target.value }))
              }
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void onSubmit(form)}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create workplace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
