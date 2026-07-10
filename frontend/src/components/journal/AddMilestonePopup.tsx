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
import { createMilestone } from "@/lib/journal/milestonesApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface AddMilestonePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  onSaved: () => void;
}

export default function AddMilestonePopup({
  open,
  onOpenChange,
  userId,
  onboardingData,
  onSaved,
}: AddMilestonePopupProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [achievedAtDate, setAchievedAtDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setAchievedAtDate("");
  }, [open]);

  const dismiss = () => onOpenChange(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Add a title before saving.");
      return;
    }

    setSaving(true);
    try {
      await createMilestone(
        userId,
        {
          title: title,
          description: description || null,
          achievedAt: achievedAtDate || null,
        },
        onboardingData,
      );
      toast.success("Milestone saved.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't save your milestone.");
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
                Add Milestone
              </DialogTitle>
              <DialogDescription
                data-style-ref="Text_small_"
                className={cn(bubbleStyle("Text_small_"), "text-left")}
              >
                Celebrate a win worth remembering.
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
              htmlFor="add-milestone-title"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Title
            </label>
            <Input
              id="add-milestone-title"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you achieve?"
              autoFocus
            />
          </div>

          <div
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="add-milestone-description"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Description
            </label>
            <Textarea
              id="add-milestone-description"
              data-style-ref="MultiLineInput_default_"
              className={cn(bubbleStyle("MultiLineInput_default_"), "resize-none")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail about this milestone"
              rows={4}
            />
          </div>

          <div
            className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
          >
            <label
              htmlFor="add-milestone-date"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
            >
              Date achieved
            </label>
            <Input
              id="add-milestone-date"
              type="date"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={achievedAtDate}
              onChange={(e) => setAchievedAtDate(e.target.value)}
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
            {saving ? "Saving…" : "Save milestone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
