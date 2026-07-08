import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EDIT_MILESTONE_CANCEL_BTN_BUBBLE_ID,
  EDIT_MILESTONE_CLOSE_BTN_BUBBLE_ID,
  EDIT_MILESTONE_DATE_FIELD_BUBBLE_ID,
  EDIT_MILESTONE_DATE_INPUT_BUBBLE_ID,
  EDIT_MILESTONE_DATE_LABEL_BUBBLE_ID,
  EDIT_MILESTONE_DELETE_BTN_BUBBLE_ID,
  EDIT_MILESTONE_DESC_FIELD_BUBBLE_ID,
  EDIT_MILESTONE_DESC_INPUT_BUBBLE_ID,
  EDIT_MILESTONE_DESC_LABEL_BUBBLE_ID,
  EDIT_MILESTONE_FORM_ACTIONS_BUBBLE_ID,
  EDIT_MILESTONE_FORM_BUBBLE_ID,
  EDIT_MILESTONE_HEADER_BUBBLE_ID,
  EDIT_MILESTONE_POPUP_BUBBLE_ID,
  EDIT_MILESTONE_RIGHT_ACTIONS_BUBBLE_ID,
  EDIT_MILESTONE_SAVE_BTN_BUBBLE_ID,
  EDIT_MILESTONE_TITLE_FIELD_BUBBLE_ID,
  EDIT_MILESTONE_TITLE_GROUP_BUBBLE_ID,
  EDIT_MILESTONE_TITLE_INPUT_BUBBLE_ID,
  EDIT_MILESTONE_TITLE_LABEL_BUBBLE_ID,
} from "@/lib/journal/routes";
import {
  deleteMilestone,
  type MilestoneListItem,
  updateMilestone,
} from "@/lib/journal/milestonesApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export interface EditMilestonePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: MilestoneListItem | null;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  onSaved: () => void;
}

export default function EditMilestonePopup({
  open,
  onOpenChange,
  milestone,
  userId,
  onboardingData,
  onSaved,
}: EditMilestonePopupProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [achievedAtDate, setAchievedAtDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !milestone) return;
    setTitle(milestone.title_text === "Untitled milestone" ? "" : milestone.title_text);
    setDescription(milestone.description_text ?? "");
    setAchievedAtDate(toDateInputValue(milestone.achieved_at_date));
  }, [open, milestone]);

  const dismiss = () => onOpenChange(false);
  const busy = saving || deleting;

  const handleSave = async () => {
    if (!milestone) return;
    if (!title.trim()) {
      toast.error("Add a title before saving.");
      return;
    }

    setSaving(true);
    try {
      await updateMilestone(
        userId,
        milestone.id,
        {
          title_text: title,
          description_text: description || null,
          achieved_at_date: achievedAtDate || null,
        },
        onboardingData,
      );
      toast.success("Milestone updated.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!milestone) return;

    setDeleting(true);
    try {
      await deleteMilestone(userId, milestone.id, onboardingData);
      toast.success("Milestone deleted.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't delete that milestone.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-bubble-id={EDIT_MILESTONE_POPUP_BUBBLE_ID}
        data-style-ref="Popup_dialog_"
        className={cn(bubbleStyle("Popup_dialog_"), "sm:max-w-lg")}
      >
        <DialogHeader
          data-bubble-id={EDIT_MILESTONE_HEADER_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "space-y-0")}
        >
          <div
            data-bubble-id={EDIT_MILESTONE_TITLE_GROUP_BUBBLE_ID}
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex items-start justify-between gap-3 pr-8",
            )}
          >
            <div className="space-y-1">
              <DialogTitle
                data-style-ref="Text_heading_2_"
                className={cn(bubbleStyle("Text_heading_2_"), "text-left")}
              >
                Edit Milestone
              </DialogTitle>
              <DialogDescription
                data-style-ref="Text_small_"
                className={cn(bubbleStyle("Text_small_"), "text-left")}
              >
                Update or remove this milestone.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            data-bubble-id={EDIT_MILESTONE_CLOSE_BTN_BUBBLE_ID}
            data-style-ref="Button_icon_"
            className={cn(
              bubbleStyle("Button_icon_"),
              "absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md",
            )}
            aria-label="Close"
            onClick={dismiss}
            disabled={busy}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </DialogHeader>

        <div
          data-bubble-id={EDIT_MILESTONE_FORM_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "space-y-4 py-1")}
        >
          <div
            data-bubble-id={EDIT_MILESTONE_TITLE_FIELD_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="edit-milestone-title"
              data-bubble-id={EDIT_MILESTONE_TITLE_LABEL_BUBBLE_ID}
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Title
            </label>
            <Input
              id="edit-milestone-title"
              data-bubble-id={EDIT_MILESTONE_TITLE_INPUT_BUBBLE_ID}
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you achieve?"
            />
          </div>

          <div
            data-bubble-id={EDIT_MILESTONE_DESC_FIELD_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="edit-milestone-description"
              data-bubble-id={EDIT_MILESTONE_DESC_LABEL_BUBBLE_ID}
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Description
            </label>
            <Textarea
              id="edit-milestone-description"
              data-bubble-id={EDIT_MILESTONE_DESC_INPUT_BUBBLE_ID}
              data-style-ref="MultiLineInput_default_"
              className={cn(bubbleStyle("MultiLineInput_default_"), "resize-none")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail about this milestone"
              rows={4}
            />
          </div>

          <div
            data-bubble-id={EDIT_MILESTONE_DATE_FIELD_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="edit-milestone-date"
              data-bubble-id={EDIT_MILESTONE_DATE_LABEL_BUBBLE_ID}
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Date achieved
            </label>
            <Input
              id="edit-milestone-date"
              type="date"
              data-bubble-id={EDIT_MILESTONE_DATE_INPUT_BUBBLE_ID}
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={achievedAtDate}
              onChange={(e) => setAchievedAtDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter
          data-bubble-id={EDIT_MILESTONE_FORM_ACTIONS_BUBBLE_ID}
          className={cn(
            bubbleStyle("Group_transparent_"),
            "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <Button
            type="button"
            variant="destructive"
            data-bubble-id={EDIT_MILESTONE_DELETE_BTN_BUBBLE_ID}
            data-style-ref="Button_destructive_"
            className={bubbleStyle("Button_destructive_")}
            onClick={handleDelete}
            disabled={busy}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>

          <div
            data-bubble-id={EDIT_MILESTONE_RIGHT_ACTIONS_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "flex w-full gap-2 sm:w-auto")}
          >
            <Button
              type="button"
              variant="ghost"
              data-bubble-id={EDIT_MILESTONE_CANCEL_BTN_BUBBLE_ID}
              data-style-ref="Button_ghost_"
              className={cn(bubbleStyle("Button_ghost_"), "flex-1 sm:flex-none")}
              onClick={dismiss}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="cta"
              data-bubble-id={EDIT_MILESTONE_SAVE_BTN_BUBBLE_ID}
              data-style-ref="Button_primary_"
              className={cn(bubbleStyle("Button_primary_"), "flex-1 sm:flex-none")}
              onClick={handleSave}
              disabled={busy}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
