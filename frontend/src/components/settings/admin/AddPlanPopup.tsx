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
  ADD_PLAN_CLOSE_BTN_BUBBLE_ID,
  ADD_PLAN_FORM_BUBBLE_ID,
  ADD_PLAN_NAME_INPUT_BUBBLE_ID,
  ADD_PLAN_POPUP_BUBBLE_ID,
  ADD_PLAN_POPUP_TITLE_BUBBLE_ID,
  ADD_PLAN_SUBMIT_BTN_BUBBLE_ID,
} from "@/lib/settings/routes";
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
}

export default function AddPlanPopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
}: AddPlanPopupProps) {
  const [form, setForm] = useState<AdminPlanFormState>(emptyAdminPlanForm());

  useEffect(() => {
    if (open) setForm(emptyAdminPlanForm());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bubble-id={ADD_PLAN_POPUP_BUBBLE_ID}>
        <DialogHeader>
          <DialogTitle data-bubble-id={ADD_PLAN_POPUP_TITLE_BUBBLE_ID}>Add subscription plan</DialogTitle>
        </DialogHeader>

        <div data-bubble-id={ADD_PLAN_FORM_BUBBLE_ID} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-plan-name">Name</Label>
            <Input
              id="add-plan-name"
              data-bubble-id={ADD_PLAN_NAME_INPUT_BUBBLE_ID}
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
            data-bubble-id={ADD_PLAN_CLOSE_BTN_BUBBLE_ID}
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-bubble-id={ADD_PLAN_SUBMIT_BTN_BUBBLE_ID}
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void onSubmit(form)}
          >
            {busy ? "Saving…" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
