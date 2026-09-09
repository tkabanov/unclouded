import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  emptyAdminPlanForm,
  type AdminPlanFormState,
} from "@/lib/settings/admin/adminPlansApi";
import { bubbleStyle } from "@/styles";

export interface AddPlanPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminPlanFormState) => Promise<void>;
  busy?: boolean;
  initialForm: AdminPlanFormState | null;
}

export default function AddPlanPopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  initialForm,
}: AddPlanPopupProps) {
  const [form, setForm] = useState<AdminPlanFormState>(emptyAdminPlanForm());

  useEffect(() => {
    if (open) setForm(initialForm ?? emptyAdminPlanForm());
  }, [open, initialForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit plan description</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-plan-desc">Description</Label>
            <Textarea
              id="add-plan-desc"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
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
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
