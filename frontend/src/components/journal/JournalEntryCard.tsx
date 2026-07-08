import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  JOURNAL_AI_BADGE_ICON_BUBBLE_ID,
  JOURNAL_AI_BADGE_TEXT_BUBBLE_ID,
  JOURNAL_AI_BADGE_WRAP_BUBBLE_ID,
  JOURNAL_CARD_DATE_BUBBLE_ID,
  JOURNAL_CARD_FOOTER_BUBBLE_ID,
  JOURNAL_CARD_HEADER_ROW_BUBBLE_ID,
  JOURNAL_CARD_META_BUBBLE_ID,
  JOURNAL_CARD_MOOD_BADGE_BUBBLE_ID,
  JOURNAL_CARD_PREVIEW_BUBBLE_ID,
  JOURNAL_CARD_TITLE_BUBBLE_ID,
  JOURNAL_ENTRY_CARD_TEMPLATE_BUBBLE_ID,
  JOURNAL_VIEW_ENTRY_BTN_BUBBLE_ID,
} from "@/lib/journal/routes";
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
      data-bubble-id={JOURNAL_ENTRY_CARD_TEMPLATE_BUBBLE_ID}
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-3 p-5 sm:p-6", className)}
    >
      <div
        data-bubble-id={JOURNAL_CARD_HEADER_ROW_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex items-start justify-between gap-3")}
      >
        <div
          data-bubble-id={JOURNAL_CARD_META_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap items-center gap-2")}
        >
          <span
            data-bubble-id={JOURNAL_CARD_MOOD_BADGE_BUBBLE_ID}
            className={cn(
              bubbleStyle("Text_caption_"),
              "rounded-full bg-accent px-2.5 py-0.5 text-[11px] text-muted-foreground",
            )}
          >
            {moodBadgeLabel(entry.mood_tag_text)}
          </span>
          <span
            data-bubble-id={JOURNAL_CARD_DATE_BUBBLE_ID}
            data-style-ref="Text_caption_"
            className={cn(bubbleStyle("Text_caption_"), "text-[11px] text-muted-foreground")}
          >
            {formatCardDate(entry.created_at)}
          </span>
        </div>
      </div>

      <h2
        data-bubble-id={JOURNAL_CARD_TITLE_BUBBLE_ID}
        data-style-ref="Text_heading_3_"
        className={cn(bubbleStyle("Text_heading_3_"), "text-lg font-semibold")}
      >
        {entry.title_text}
      </h2>

      {entry.content_preview ? (
        <p
          data-bubble-id={JOURNAL_CARD_PREVIEW_BUBBLE_ID}
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
        data-bubble-id={JOURNAL_CARD_FOOTER_BUBBLE_ID}
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-wrap items-center justify-between gap-3 pt-1",
        )}
      >
        {entry.has_ai_reflection ? (
          <div
            data-bubble-id={JOURNAL_AI_BADGE_WRAP_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-1.5")}
          >
            <span
              data-bubble-id={JOURNAL_AI_BADGE_ICON_BUBBLE_ID}
              data-style-ref="Icon_primary_"
              className={cn(bubbleStyle("Icon_primary_"), "shrink-0")}
              aria-hidden
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <span
              data-bubble-id={JOURNAL_AI_BADGE_TEXT_BUBBLE_ID}
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
          data-bubble-id={JOURNAL_VIEW_ENTRY_BTN_BUBBLE_ID}
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
