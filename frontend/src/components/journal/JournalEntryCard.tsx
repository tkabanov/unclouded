import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalEntryListItem } from "@/lib/journal/journalEntriesApi";
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

function formatCardDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface JournalEntryCardProps {
  entry: JournalEntryListItem;
  onViewEntry: (entry: JournalEntryListItem) => void;
  className?: string;
}

export default function JournalEntryCard({
  entry,
  onViewEntry,
  className,
}: JournalEntryCardProps) {
  return (
    <article
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-3 p-5 sm:p-6", className)}
    >
      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex items-start justify-between gap-3")}
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
            {moodBadgeLabel(entry.moodTag)}
          </span>
          <span
            data-style-ref="Text_caption_"
            className={cn(bubbleStyle("Text_caption_"), "text-[11px] text-muted-foreground")}
          >
            {formatCardDate(entry.createdAt)}
          </span>
        </div>
      </div>

      <h2
        data-style-ref="Text_heading_3_"
        className={cn(bubbleStyle("Text_heading_3_"), "text-lg font-semibold")}
      >
        {entry.title}
      </h2>

      {entry.content_preview ? (
        <p
          data-style-ref="Text_body_muted_"
          className={cn(
            bubbleStyle("Text_body_muted_"),
            "whitespace-pre-wrap line-clamp-4 text-sm",
          )}
        >
          {entry.content_preview}
        </p>
      ) : null}

      <div
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-wrap items-center justify-between gap-3 pt-1",
        )}
      >
        {entry.has_ai_reflection ? (
          <div
            className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-1.5")}
          >
            <span
              data-style-ref="Icon_primary_"
              className={cn(bubbleStyle("Icon_primary_"), "shrink-0")}
              aria-hidden
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <span
              data-style-ref="Text_caption_"
              className={cn(bubbleStyle("Text_caption_"), "text-xs text-muted-foreground")}
            >
              AI Reflection
            </span>
          </div>
        ) : (
          <span />
        )}

        <button
          type="button"
          data-style-ref="Button_accent_"
          className={cn(bubbleStyle("Button_accent_"), "shrink-0 text-sm")}
          onClick={() => onViewEntry(entry)}
        >
          View &amp; Edit
        </button>
      </div>
    </article>
  );
}
