import { useEffect, useState } from "react";
import { Info, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  deleteJournalEntry,
  type JournalEntryListItem,
  updateJournalEntry,
} from "@/lib/journal/journalEntriesApi";
import { generateJournalReflection } from "@/lib/journal/journalReflectionApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

const MOOD_EMOJI: Record<string, string> = {
  Calm: "😌",
  Hopeful: "🌤️",
  Grateful: "🙏",
  Tired: "😮‍💨",
  Anxious: "😟",
  Low: "🌧️",
  Focused: "🎯",
  Proud: "✨",
};

function moodBadgeLabel(mood: string | null): string {
  if (!mood) return "Note";
  const emoji = MOOD_EMOJI[mood];
  return emoji ? `${emoji} ${mood}` : mood;
}

function formatDetailDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface EntryDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: JournalEntryListItem | null;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  /** Pro/Premium only — hides generate UI for free tier. */
  canGenerateAiReflection?: boolean;
  onSaved: () => void;
}

export default function EntryDetailPopup({
  open,
  onOpenChange,
  entry,
  userId,
  onboardingData,
  canGenerateAiReflection = false,
  onSaved,
}: EntryDetailPopupProps) {
  const [title, setTitle] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [content, setContent] = useState("");
  const [aiReflection, setAiReflection] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !entry) return;
    setTitle(entry.title === "Untitled entry" ? "" : entry.title);
    setMoodTag(entry.moodTag ?? "");
    setContent(entry.content);
    setAiReflection(entry.aiReflection);
    setShowDeleteConfirm(false);
  }, [open, entry]);

  const dismiss = () => onOpenChange(false);
  const busy = saving || deleting || generating;
  const showAiReflectionSection =
    canGenerateAiReflection || Boolean(aiReflection);

  const handleSave = async () => {
    if (!entry) return;
    if (!title.trim() && !content.trim()) {
      toast.error("Add a title or some words before saving.");
      return;
    }

    setSaving(true);
    try {
      await updateJournalEntry(
        userId,
        entry.id,
        {
          title: title,
          moodTag: moodTag.trim() || null,
          content: content,
        },
        onboardingData,
      );
      toast.success("Entry updated.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    setDeleting(true);
    try {
      await deleteJournalEntry(userId, entry.id, onboardingData);
      toast.success("Entry deleted.");
      onSaved();
      dismiss();
    } catch {
      toast.error("Couldn't delete that entry.");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateReflection = async () => {
    if (!entry || !canGenerateAiReflection) return;

    setGenerating(true);
    try {
      const updated = await generateJournalReflection(
        userId,
        {
          ...entry,
          title: title.trim() || entry.title,
          moodTag: moodTag.trim() || null,
          content: content.trim() || entry.content,
        },
        onboardingData,
      );
      setAiReflection(updated.aiReflection);
      toast.success("AI reflection generated.");
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't generate a reflection.";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-style-ref="Popup_dialog_"
        className={cn(
          bubbleStyle("Popup_dialog_"),
          "max-h-[90vh] overflow-y-auto sm:max-w-lg [&>button.absolute]:hidden",
        )}
      >
        <header
          className={cn(bubbleStyle("Group_transparent_"), "space-y-3 pr-8")}
        >
          <div
            className={cn(bubbleStyle("Group_transparent_"), "space-y-2")}
          >
            <div
              className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap items-center gap-2")}
            >
              <span
                className={cn(
                  bubbleStyle("Text_caption_"),
                  "rounded-full bg-accent px-2.5 py-0.5 text-[11px] text-muted-foreground",
                )}
              >
                {moodBadgeLabel((entry?.moodTag ?? moodTag.trim()) || null)}
              </span>
              {entry ? (
                <span
                  data-style-ref="Text_caption_"
                  className={cn(bubbleStyle("Text_caption_"), "text-[11px] text-muted-foreground")}
                >
                  {formatDetailDate(entry.createdAt)}
                </span>
              ) : null}
            </div>

            <h2
              data-style-ref="Text_heading_2_"
              className={cn(bubbleStyle("Text_heading_2_"), "text-left text-xl font-semibold")}
            >
              {title.trim() || entry?.title || "Journal Entry"}
            </h2>
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
        </header>

        {showDeleteConfirm ? (
          <section
            className={cn(bubbleStyle("Group_transparent_"), "space-y-4 py-2")}
          >
            <p
              data-style-ref="Text_body_"
              className={cn(bubbleStyle("Text_body_"), "text-sm text-muted-foreground")}
            >
              Are you sure you want to delete this entry? This action cannot be undone.
            </p>

            <div
              className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap gap-2")}
            >
              <Button
                type="button"
                variant="outline"
                data-style-ref="Button_secondary_"
                className={bubbleStyle("Button_secondary_")}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={busy}
              >
                Keep Entry
              </Button>
              <Button
                type="button"
                variant="destructive"
                data-style-ref="Button_destructive_"
                className={bubbleStyle("Button_destructive_")}
                onClick={handleDelete}
                disabled={busy}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div
              className={cn(bubbleStyle("Group_transparent_"), "space-y-4 py-1")}
            >
              <div
                className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
              >
                <label
                  htmlFor="entry-edit-title"
                  data-style-ref="Text_label_"
                  className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
                >
                  Title
                </label>
                <Input
                  id="entry-edit-title"
                  data-style-ref="Input_default_"
                  className={bubbleStyle("Input_default_")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entry title"
                />
              </div>

              <div
                className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
              >
                <label
                  htmlFor="entry-edit-mood"
                  data-style-ref="Text_label_"
                  className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
                >
                  Mood Tag
                </label>
                <Input
                  id="entry-edit-mood"
                  data-style-ref="Input_default_"
                  className={bubbleStyle("Input_default_")}
                  value={moodTag}
                  onChange={(e) => setMoodTag(e.target.value)}
                  placeholder="e.g. Grateful, Calm, Anxious..."
                />
              </div>

              <div
                className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
              >
                <label
                  htmlFor="entry-edit-content"
                  data-style-ref="Text_label_"
                  className={cn(bubbleStyle("Text_label_"), "block text-sm font-medium")}
                >
                  Reflection
                </label>
                <Textarea
                  id="entry-edit-content"
                  data-style-ref="MultiLineInput_default_"
                  className={cn(bubbleStyle("MultiLineInput_default_"), "resize-none")}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Your reflection..."
                  rows={6}
                />
              </div>
            </div>

            {showAiReflectionSection ? (
              <section
                className={cn(
                  bubbleStyle("Group_transparent_"),
                  "space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4",
                )}
              >
                <div
                  className={cn(
                    bubbleStyle("Group_transparent_"),
                    "flex flex-wrap items-center justify-between gap-3",
                  )}
                >
                  <div
                    className={cn(bubbleStyle("Group_transparent_"), "space-y-1")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        data-style-ref="Icon_primary_"
                        className={cn(bubbleStyle("Icon_primary_"), "inline-flex")}
                        aria-hidden
                      >
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <span
                        data-style-ref="Text_label_"
                        className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}
                      >
                        AI Coaching Reflection
                      </span>
                      <span
                        data-style-ref="Text_caption_"
                        className={cn(
                          bubbleStyle("Text_caption_"),
                          "inline-flex items-center gap-1 text-xs text-muted-foreground",
                        )}
                      >
                        <Info className="h-3 w-3" aria-hidden />
                        Coaching only
                      </span>
                    </div>
                  </div>

                  {canGenerateAiReflection ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-style-ref="Button_secondary_"
                      className={bubbleStyle("Button_secondary_")}
                      onClick={handleGenerateReflection}
                      disabled={busy}
                    >
                      {generating ? "Generating…" : "Generate Reflection"}
                    </Button>
                  ) : null}
                </div>

                <div
                  className={cn(bubbleStyle("Group_transparent_"), "space-y-2")}
                >
                  {aiReflection ? (
                    <p
                      data-style-ref="Text_body_muted_"
                      className={cn(
                        bubbleStyle("Text_body_muted_"),
                        "whitespace-pre-wrap text-sm leading-relaxed",
                      )}
                    >
                      {aiReflection}
                    </p>
                  ) : canGenerateAiReflection ? (
                    <p
                      data-style-ref="Text_body_muted_"
                      className={cn(
                        bubbleStyle("Text_body_muted_"),
                        "text-sm italic text-muted-foreground",
                      )}
                    >
                      Generate a coaching reflection based on this entry.
                    </p>
                  ) : null}

                  <p
                    data-style-ref="Text_caption_"
                    className={cn(bubbleStyle("Text_caption_"), "text-xs text-muted-foreground")}
                  >
                    This reflection is coaching guidance only — not therapy or medical advice.
                  </p>
                </div>
              </section>
            ) : null}

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
                onClick={() => setShowDeleteConfirm(true)}
                disabled={busy}
              >
                Delete Entry
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
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
