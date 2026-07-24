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
  type ContractTier,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="add-workplace-email">HR contact email</Label>
            <Input
              id="add-workplace-email"
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, contactEmail: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-tier">Contract tier</Label>
              <select
                id="add-workplace-tier"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.contractTier}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    contractTier: event.target.value as ContractTier,
                  }))
                }
              >
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-workplace-seats">Seat count</Label>
              <Input
                id="add-workplace-seats"
                type="number"
                min={1}
                value={form.seatCount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    seatCount: Number(event.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-start">Contract start</Label>
              <Input
                id="add-workplace-start"
                type="date"
                value={form.contractStartDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contractStartDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-workplace-end">Contract end</Label>
              <Input
                id="add-workplace-end"
                type="date"
                value={form.contractEndDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contractEndDate: event.target.value }))
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Organization enrollment is active
          </label>
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
