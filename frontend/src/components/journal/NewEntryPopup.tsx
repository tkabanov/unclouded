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
import { createJournalEntry } from "@/lib/journal/journalEntriesApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface NewEntryPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  onSaved: () => void;
}

export default function NewEntryPopup({
  open,
  onOpenChange,
  userId,
  onboardingData,
  onSaved,
}: NewEntryPopupProps) {
  const [title, setTitle] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setMoodTag("");
    setContent("");
  }, [open]);

  const dismiss = () => onOpenChange(false);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Add a title or some words before saving.");
      return;
    }

    setSaving(true);
    try {
      await createJournalEntry(
        userId,
        {
          title: title,
          moodTag: moodTag.trim() || null,
          content: content,
        },
        onboardingData,
      );
      toast.success("Entry saved.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't save your entry.");
    } finally {
      setSaving(false);
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
                New Journal Entry
              </DialogTitle>
              <DialogDescription
                data-style-ref="Text_small_"
                className={cn(bubbleStyle("Text_small_"), "text-left")}
              >
                Write freely — your entries are private to you.
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
            disabled={saving}
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
              htmlFor="new-entry-title"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Entry Title
            </label>
            <Input
              id="new-entry-title"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this entry a name..."
              autoFocus
            />
          </div>

          <div
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="new-entry-mood"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Mood Tag
            </label>
            <Input
              id="new-entry-mood"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={moodTag}
              onChange={(e) => setMoodTag(e.target.value)}
              placeholder="e.g. Grateful, Anxious, Hopeful, Focused..."
            />
          </div>

          <div
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="new-entry-content"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Your Reflection
            </label>
            <Textarea
              id="new-entry-content"
              data-style-ref="MultiLineInput_default_"
              className={cn(bubbleStyle("MultiLineInput_default_"), "resize-none")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind today? Write freely — this is your private space..."
              rows={8}
            />
          </div>
        </div>

        <DialogFooter
          className={cn(bubbleStyle("Group_transparent_"), "gap-2 sm:justify-end")}
        >
          <Button
            type="button"
            variant="ghost"
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
            data-style-ref="Button_primary_"
            className={bubbleStyle("Button_primary_")}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
