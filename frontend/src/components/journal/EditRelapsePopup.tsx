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
  EDIT_RELAPSE_CANCEL_BTN_BUBBLE_ID,
  EDIT_RELAPSE_CLOSE_BTN_BUBBLE_ID,
  EDIT_RELAPSE_DATE_FIELD_BUBBLE_ID,
  EDIT_RELAPSE_DATE_INPUT_BUBBLE_ID,
  EDIT_RELAPSE_DATE_LABEL_BUBBLE_ID,
  EDIT_RELAPSE_DELETE_BTN_BUBBLE_ID,
  EDIT_RELAPSE_FORM_ACTIONS_BUBBLE_ID,
  EDIT_RELAPSE_FORM_BUBBLE_ID,
  EDIT_RELAPSE_HEADER_BUBBLE_ID,
  EDIT_RELAPSE_NOTES_FIELD_BUBBLE_ID,
  EDIT_RELAPSE_NOTES_INPUT_BUBBLE_ID,
  EDIT_RELAPSE_NOTES_LABEL_BUBBLE_ID,
  EDIT_RELAPSE_POPUP_BUBBLE_ID,
  EDIT_RELAPSE_POPUP_SUBTITLE_BUBBLE_ID,
  EDIT_RELAPSE_POPUP_TITLE_BUBBLE_ID,
  EDIT_RELAPSE_RIGHT_ACTIONS_BUBBLE_ID,
  EDIT_RELAPSE_SAVE_BTN_BUBBLE_ID,
  EDIT_RELAPSE_TITLE_GROUP_BUBBLE_ID,
} from "@/lib/journal/routes";
import {
  deleteRelapseEvent,
  type RelapseEventListItem,
  updateRelapseEvent,
} from "@/lib/journal/relapseEventsApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export interface EditRelapsePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: RelapseEventListItem | null;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  onSaved: () => void;
}

export default function EditRelapsePopup({
  open,
  onOpenChange,
  event,
  userId,
  onboardingData,
  onSaved,
}: EditRelapsePopupProps) {
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    setEventDate(toDateInputValue(event.event_date_date));
    setNotes(event.notes_text ?? "");
  }, [open, event]);

  const dismiss = () => onOpenChange(false);
  const busy = saving || deleting;

  const handleSave = async () => {
    if (!event) return;
    if (!eventDate.trim()) {
      toast.error("Add an event date before saving.");
      return;
    }

    setSaving(true);
    try {
      await updateRelapseEvent(
        userId,
        event.id,
        {
          event_date_date: eventDate || null,
          notes_text: notes || null,
        },
        onboardingData,
      );
      toast.success("Recovery event updated.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    setDeleting(true);
    try {
      await deleteRelapseEvent(userId, event.id, onboardingData);
      toast.success("Recovery event deleted.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't delete that recovery event.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-bubble-id={EDIT_RELAPSE_POPUP_BUBBLE_ID}
        data-style-ref="Popup_dialog_"
        className={cn(bubbleStyle("Popup_dialog_"), "sm:max-w-lg")}
      >
        <DialogHeader
          data-bubble-id={EDIT_RELAPSE_HEADER_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "space-y-0")}
        >
          <div
            data-bubble-id={EDIT_RELAPSE_TITLE_GROUP_BUBBLE_ID}
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex items-start justify-between gap-3 pr-8",
            )}
          >
            <div className="space-y-1">
              <DialogTitle
                data-bubble-id={EDIT_RELAPSE_POPUP_TITLE_BUBBLE_ID}
                data-style-ref="Text_heading_2_"
                className={cn(bubbleStyle("Text_heading_2_"), "text-left")}
              >
                Edit Recovery Event
              </DialogTitle>
              <DialogDescription
                data-bubble-id={EDIT_RELAPSE_POPUP_SUBTITLE_BUBBLE_ID}
                data-style-ref="Text_small_"
                className={cn(bubbleStyle("Text_small_"), "text-left")}
              >
                Update or remove this event.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            data-bubble-id={EDIT_RELAPSE_CLOSE_BTN_BUBBLE_ID}
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
          data-bubble-id={EDIT_RELAPSE_FORM_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "space-y-4 py-1")}
        >
          <div
            data-bubble-id={EDIT_RELAPSE_DATE_FIELD_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="edit-relapse-date"
              data-bubble-id={EDIT_RELAPSE_DATE_LABEL_BUBBLE_ID}
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Event date
            </label>
            <Input
              id="edit-relapse-date"
              type="date"
              data-bubble-id={EDIT_RELAPSE_DATE_INPUT_BUBBLE_ID}
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div
            data-bubble-id={EDIT_RELAPSE_NOTES_FIELD_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="edit-relapse-notes"
              data-bubble-id={EDIT_RELAPSE_NOTES_LABEL_BUBBLE_ID}
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Notes
            </label>
            <Textarea
              id="edit-relapse-notes"
              data-bubble-id={EDIT_RELAPSE_NOTES_INPUT_BUBBLE_ID}
              data-style-ref="MultiLineInput_default_"
              className={cn(bubbleStyle("MultiLineInput_default_"), "resize-none")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? How are you feeling?"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter
          data-bubble-id={EDIT_RELAPSE_FORM_ACTIONS_BUBBLE_ID}
          className={cn(
            bubbleStyle("Group_transparent_"),
            "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <Button
            type="button"
            variant="destructive"
            data-bubble-id={EDIT_RELAPSE_DELETE_BTN_BUBBLE_ID}
            data-style-ref="Button_destructive_"
            className={bubbleStyle("Button_destructive_")}
            onClick={handleDelete}
            disabled={busy}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>

          <div
            data-bubble-id={EDIT_RELAPSE_RIGHT_ACTIONS_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "flex w-full gap-2 sm:w-auto")}
          >
            <Button
              type="button"
              variant="ghost"
              data-bubble-id={EDIT_RELAPSE_CANCEL_BTN_BUBBLE_ID}
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
              data-bubble-id={EDIT_RELAPSE_SAVE_BTN_BUBBLE_ID}
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
