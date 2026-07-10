import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  editPlanId?: string | null;
  initialForm?: AdminPlanFormState | null;
}

export default function AddPlanPopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editPlanId = null,
  initialForm = null,
}: AddPlanPopupProps) {
  const [form, setForm] = useState<AdminPlanFormState>(emptyAdminPlanForm());
  const isEdit = Boolean(editPlanId);

  useEffect(() => {
    if (open) setForm(initialForm ?? emptyAdminPlanForm());
  }, [open, initialForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit subscription plan" : "Add subscription plan"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-plan-name">Name</Label>
            <Input
              id="add-plan-name"
              className={bubbleStyle("Input_default_")}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-plan-price">Monthly price (USD)</Label>
            <Input
              id="add-plan-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, price: Number(event.target.value) || 0 }))
              }
            />
          </div>

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

          <div className="grid gap-2">
            <Label htmlFor="add-plan-features">Features (one per line)</Label>
            <Textarea
              id="add-plan-features"
              rows={4}
              value={form.features}
              onChange={(event) => setForm((prev) => ({ ...prev, features: event.target.value }))}
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
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
