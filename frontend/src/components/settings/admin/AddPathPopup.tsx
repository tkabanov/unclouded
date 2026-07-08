import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ADD_PATH_CLOSE_BTN_BUBBLE_ID,
  ADD_PATH_FORM_BUBBLE_ID,
  ADD_PATH_POPUP_BUBBLE_ID,
  ADD_PATH_POPUP_TITLE_BUBBLE_ID,
  ADD_PATH_SUBMIT_BTN_BUBBLE_ID,
  ADD_PATH_TIER_SELECT_BUBBLE_ID,
  ADD_PATH_TITLE_INPUT_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  AI_COACHING_MODE_ORDER,
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { TIER_ORDER } from "@/lib/enums/tier";
import { getTierSubscriptionLabel } from "@/lib/enums/subscription";
import {
  SENSITIVITY_OPTIONS,
  type AdminPathFormState,
  emptyAdminPathForm,
} from "@/lib/settings/admin/adminPathsApi";
import { bubbleStyle } from "@/styles";

export interface AddPathPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminPathFormState) => Promise<void>;
  busy?: boolean;
  editPathId?: string | null;
  initialForm?: AdminPathFormState | null;
}

export default function AddPathPopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editPathId = null,
  initialForm = null,
}: AddPathPopupProps) {
  const [form, setForm] = useState<AdminPathFormState>(emptyAdminPathForm());
  const isEdit = Boolean(editPathId);

  useEffect(() => {
    if (open) setForm(initialForm ?? emptyAdminPathForm());
  }, [open, initialForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bubble-id={ADD_PATH_POPUP_BUBBLE_ID}>
        <DialogHeader>
          <DialogTitle data-bubble-id={ADD_PATH_POPUP_TITLE_BUBBLE_ID}>
            {isEdit ? "Edit guided path" : "Add guided path"}
          </DialogTitle>
        </DialogHeader>

        <div data-bubble-id={ADD_PATH_FORM_BUBBLE_ID} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-path-title">Title</Label>
            <Input
              id="add-path-title"
              data-bubble-id={ADD_PATH_TITLE_INPUT_BUBBLE_ID}
              className={bubbleStyle("Input_default_")}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-tier">Tier</Label>
            <Select
              value={form.tier}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, tier: value as AdminPathFormState["tier"] }))
              }
            >
              <SelectTrigger
                id="add-path-tier"
                data-bubble-id={ADD_PATH_TIER_SELECT_BUBBLE_ID}
                className={bubbleStyle("Input_default_")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIER_ORDER.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {getTierSubscriptionLabel(tier)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-mode">Primary coaching mode</Label>
            <Select
              value={form.coachingMode}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  coachingMode: value as AiCoachingModeSlug,
                }))
              }
            >
              <SelectTrigger id="add-path-mode" className={bubbleStyle("Input_default_")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_COACHING_MODE_ORDER.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {AI_COACHING_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-submode">Sub-mode tag</Label>
            <Input
              id="add-path-submode"
              value={form.subMode}
              onChange={(event) => setForm((prev) => ({ ...prev, subMode: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-sensitivity">Sensitivity</Label>
            <Select
              value={form.sensitivity}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  sensitivity: value as AdminPathFormState["sensitivity"],
                }))
              }
            >
              <SelectTrigger id="add-path-sensitivity" className={bubbleStyle("Input_default_")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSITIVITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-desc">Description</Label>
            <Textarea
              id="add-path-desc"
              rows={4}
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
            data-bubble-id={ADD_PATH_CLOSE_BTN_BUBBLE_ID}
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-bubble-id={ADD_PATH_SUBMIT_BTN_BUBBLE_ID}
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void onSubmit(form)}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create path"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
