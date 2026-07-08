import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  ADD_RESOURCE_CLOSE_BTN_BUBBLE_ID,
  ADD_RESOURCE_FORM_BUBBLE_ID,
  ADD_RESOURCE_POPUP_BUBBLE_ID,
  ADD_RESOURCE_POPUP_TITLE_BUBBLE_ID,
  ADD_RESOURCE_SENSITIVITY_SELECT_BUBBLE_ID,
  ADD_RESOURCE_SUBMIT_BTN_BUBBLE_ID,
  ADD_RESOURCE_TITLE_INPUT_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  AI_COACHING_MODE_ORDER,
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import {
  SENSITIVITY_OPTIONS,
  type AdminResourceFormState,
  emptyAdminResourceForm,
} from "@/lib/settings/admin/adminResourcesApi";
import { bubbleStyle } from "@/styles";

export interface AddResourcePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminResourceFormState) => Promise<void>;
  busy?: boolean;
}

export default function AddResourcePopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
}: AddResourcePopupProps) {
  const [form, setForm] = useState<AdminResourceFormState>(emptyAdminResourceForm());

  useEffect(() => {
    if (open) setForm(emptyAdminResourceForm());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bubble-id={ADD_RESOURCE_POPUP_BUBBLE_ID}>
        <DialogHeader>
          <DialogTitle data-bubble-id={ADD_RESOURCE_POPUP_TITLE_BUBBLE_ID}>
            Add resource
          </DialogTitle>
        </DialogHeader>

        <div data-bubble-id={ADD_RESOURCE_FORM_BUBBLE_ID} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-resource-title">Title</Label>
            <Input
              id="add-resource-title"
              data-bubble-id={ADD_RESOURCE_TITLE_INPUT_BUBBLE_ID}
              className={bubbleStyle("Input_default_")}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-resource-content">Content</Label>
            <Textarea
              id="add-resource-content"
              rows={4}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-resource-mode">Primary mode</Label>
            <Select
              value={form.primaryMode}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, primaryMode: value as AiCoachingModeSlug }))
              }
            >
              <SelectTrigger id="add-resource-mode" className={bubbleStyle("Input_default_")}>
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
            <Label htmlFor="add-resource-submode">Sub-mode tag</Label>
            <Input
              id="add-resource-submode"
              value={form.subMode}
              onChange={(event) => setForm((prev) => ({ ...prev, subMode: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-resource-sensitivity">Sensitivity</Label>
            <Select
              value={form.sensitivity}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  sensitivity: value as AdminResourceFormState["sensitivity"],
                }))
              }
            >
              <SelectTrigger
                id="add-resource-sensitivity"
                data-bubble-id={ADD_RESOURCE_SENSITIVITY_SELECT_BUBBLE_ID}
                className={bubbleStyle("Input_default_")}
              >
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
            <Label htmlFor="add-resource-link">External link (optional)</Label>
            <Input
              id="add-resource-link"
              value={form.externalLink ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, externalLink: event.target.value }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="add-resource-free">Free resource</Label>
            <Switch
              id="add-resource-free"
              checked={form.isFree}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isFree: checked }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            data-bubble-id={ADD_RESOURCE_CLOSE_BTN_BUBBLE_ID}
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-bubble-id={ADD_RESOURCE_SUBMIT_BTN_BUBBLE_ID}
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void onSubmit(form)}
          >
            {busy ? "Saving…" : "Create resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
