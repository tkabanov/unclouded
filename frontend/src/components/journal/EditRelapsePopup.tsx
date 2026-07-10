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
    setEventDate(toDateInputValue(event.eventDate));
    setNotes(event.notes ?? "");
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
          eventDate: eventDate || null,
          notes: notes || null,
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
        data-style-ref="Popup_dialog_"
        className={cn(bubbleStyle("Popup_dialog_"), "sm:max-w-lg")}
      >
        <DialogHeader
          className={cn(bubbleStyle("Group_transparent_"), "space-y-0")}
        >
          <div
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
                Edit Recovery Event
              </DialogTitle>
              <DialogDescription
                data-style-ref="Text_small_"
                className={cn(bubbleStyle("Text_small_"), "text-left")}
              >
                Update or remove this event.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
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
          className={cn(bubbleStyle("Group_transparent_"), "space-y-4 py-1")}
        >
          <div
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="edit-relapse-date"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Event date
            </label>
            <Input
              id="edit-relapse-date"
              type="date"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="edit-relapse-notes"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Notes
            </label>
            <Textarea
              id="edit-relapse-notes"
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
          className={cn(
            bubbleStyle("Group_transparent_"),
            "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <Button
            type="button"
            variant="destructive"
            data-style-ref="Button_destructive_"
            className={bubbleStyle("Button_destructive_")}
            onClick={handleDelete}
            disabled={busy}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>

          <div
            className={cn(bubbleStyle("Group_transparent_"), "flex w-full gap-2 sm:w-auto")}
          >
            <Button
              type="button"
              variant="ghost"
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
