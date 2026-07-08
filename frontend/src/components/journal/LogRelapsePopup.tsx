import { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";
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
  LOG_RELAPSE_CANCEL_BTN_BUBBLE_ID,
  LOG_RELAPSE_CLOSE_BTN_BUBBLE_ID,
  LOG_RELAPSE_DATE_FIELD_BUBBLE_ID,
  LOG_RELAPSE_DATE_INPUT_BUBBLE_ID,
  LOG_RELAPSE_DATE_LABEL_BUBBLE_ID,
  LOG_RELAPSE_DISCLAIMER_BUBBLE_ID,
  LOG_RELAPSE_DISCLAIMER_ICON_BUBBLE_ID,
  LOG_RELAPSE_DISCLAIMER_TEXT_BUBBLE_ID,
  LOG_RELAPSE_FORM_ACTIONS_BUBBLE_ID,
  LOG_RELAPSE_FORM_BUBBLE_ID,
  LOG_RELAPSE_HEADER_BUBBLE_ID,
  LOG_RELAPSE_NOTES_FIELD_BUBBLE_ID,
  LOG_RELAPSE_NOTES_INPUT_BUBBLE_ID,
  LOG_RELAPSE_NOTES_LABEL_BUBBLE_ID,
  LOG_RELAPSE_NOTES_LABEL_TEXT_BUBBLE_ID,
  LOG_RELAPSE_POPUP_BUBBLE_ID,
  LOG_RELAPSE_POPUP_SUBTITLE_BUBBLE_ID,
  LOG_RELAPSE_POPUP_TITLE_BUBBLE_ID,
  LOG_RELAPSE_SAVE_BTN_BUBBLE_ID,
  LOG_RELAPSE_TITLE_GROUP_BUBBLE_ID,
} from "@/lib/journal/routes";
import { createRelapseEvent } from "@/lib/journal/relapseEventsApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface LogRelapsePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  onSaved: () => void;
}

export default function LogRelapsePopup({
  open,
  onOpenChange,
  userId,
  onboardingData,
  onSaved,
}: LogRelapsePopupProps) {
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEventDate("");
    setNotes("");
  }, [open]);

  const dismiss = () => onOpenChange(false);

  const handleSave = async () => {
    if (!eventDate.trim()) {
      toast.error("Add an event date before saving.");
      return;
    }

    setSaving(true);
    try {
      await createRelapseEvent(
        userId,
        {
          event_date_date: eventDate || null,
          notes_text: notes || null,
        },
        onboardingData,
      );
      toast.success("Recovery event saved.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't save your recovery event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-bubble-id={LOG_RELAPSE_POPUP_BUBBLE_ID}
        data-style-ref="Popup_dialog_"
        className={cn(bubbleStyle("Popup_dialog_"), "sm:max-w-lg")}
      >
        <DialogHeader
          data-bubble-id={LOG_RELAPSE_HEADER_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "space-y-0")}
        >
          <div
            data-bubble-id={LOG_RELAPSE_TITLE_GROUP_BUBBLE_ID}
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex items-start justify-between gap-3 pr-8",
            )}
          >
            <div className="space-y-1">
              <DialogTitle
                data-bubble-id={LOG_RELAPSE_POPUP_TITLE_BUBBLE_ID}
                data-style-ref="Text_heading_2_"
                className={cn(bubbleStyle("Text_heading_2_"), "text-left")}
              >
                Log Recovery Event
              </DialogTitle>
              <DialogDescription
                data-bubble-id={LOG_RELAPSE_POPUP_SUBTITLE_BUBBLE_ID}
                data-style-ref="Text_small_"
                className={cn(bubbleStyle("Text_small_"), "text-left")}
              >
                Record honestly — this section stays private to you.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            data-bubble-id={LOG_RELAPSE_CLOSE_BTN_BUBBLE_ID}
            data-style-ref="Button_icon_"
            className={cn(
              bubbleStyle("Button_icon_"),
              "absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md",
            )}
            aria-label="Close"
            onClick={dismiss}
            disabled={saving}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </DialogHeader>

        <div
          data-bubble-id={LOG_RELAPSE_FORM_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "space-y-4 py-1")}
        >
          <div
            data-bubble-id={LOG_RELAPSE_DATE_FIELD_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="log-relapse-date"
              data-bubble-id={LOG_RELAPSE_DATE_LABEL_BUBBLE_ID}
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Event date
            </label>
            <Input
              id="log-relapse-date"
              type="date"
              data-bubble-id={LOG_RELAPSE_DATE_INPUT_BUBBLE_ID}
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              autoFocus
            />
          </div>

          <div
            data-bubble-id={LOG_RELAPSE_NOTES_FIELD_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <div
              data-bubble-id={LOG_RELAPSE_NOTES_LABEL_BUBBLE_ID}
              className={cn(bubbleStyle("Group_transparent_"))}
            >
              <label
                htmlFor="log-relapse-notes"
                data-bubble-id={LOG_RELAPSE_NOTES_LABEL_TEXT_BUBBLE_ID}
                data-style-ref="Text_label_"
                className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
              >
                Notes
              </label>
            </div>
            <Textarea
              id="log-relapse-notes"
              data-bubble-id={LOG_RELAPSE_NOTES_INPUT_BUBBLE_ID}
              data-style-ref="MultiLineInput_default_"
              className={cn(bubbleStyle("MultiLineInput_default_"), "resize-none")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? How are you feeling?"
              rows={4}
            />
          </div>

          <div
            data-bubble-id={LOG_RELAPSE_DISCLAIMER_BUBBLE_ID}
            data-style-ref="Group_info_banner_"
            className={cn(
              bubbleStyle("Group_info_banner_"),
              "flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5",
            )}
          >
            <span
              data-bubble-id={LOG_RELAPSE_DISCLAIMER_ICON_BUBBLE_ID}
              data-style-ref="Icon_muted_"
              className={cn(bubbleStyle("Icon_muted_"), "mt-0.5 shrink-0")}
              aria-hidden
            >
              <Lock className="h-4 w-4" />
            </span>
            <p
              data-bubble-id={LOG_RELAPSE_DISCLAIMER_TEXT_BUBBLE_ID}
              data-style-ref="Text_caption_"
              className={cn(bubbleStyle("Text_caption_"), "text-xs text-muted-foreground")}
            >
              This information is private and only visible to you.
            </p>
          </div>
        </div>

        <DialogFooter
          data-bubble-id={LOG_RELAPSE_FORM_ACTIONS_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "gap-2 sm:justify-end")}
        >
          <Button
            type="button"
            variant="ghost"
            data-bubble-id={LOG_RELAPSE_CANCEL_BTN_BUBBLE_ID}
            data-style-ref="Button_ghost_"
            className={bubbleStyle("Button_ghost_")}
            onClick={dismiss}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="cta"
            data-bubble-id={LOG_RELAPSE_SAVE_BTN_BUBBLE_ID}
            data-style-ref="Button_primary_"
            className={bubbleStyle("Button_primary_")}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
