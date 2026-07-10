import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchJournalPreviewEntries,
  type JournalPreviewEntry,
} from "@/lib/dashboard/journalPreviewApi";
import { Skeleton } from "@/components/ui/skeleton";

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

function moodLabel(mood: string | null): string {
  if (!mood) return "Note";
  const emoji = MOOD_EMOJI[mood];
  return emoji ? `${emoji} ${mood}` : mood;
}

function formatPreviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function JournalPreviewCell({ entry }: { entry: JournalPreviewEntry }) {
  return (
    <div
      className={cn(
        bubbleStyle("Group_transparent_"),
        "flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0",
      )}
    >
      <div
        className={cn(bubbleStyle("Group_transparent_"), "min-w-0 flex-1 space-y-1")}
      >
        <p
          data-style-ref="Text_label_"
          className={cn(bubbleStyle("Text_label_"), "truncate text-sm font-medium")}
        >
          {entry.title}
        </p>
        {entry.preview ? (
          <p
            data-style-ref="Text_small_"
            className={cn(bubbleStyle("Text_small_"), "line-clamp-2 text-xs text-muted-foreground")}
          >
            {entry.preview}
          </p>
        ) : null}
      </div>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex shrink-0 flex-col items-end gap-1 text-right")}
      >
        <p
          className={cn(
            bubbleStyle("Text_caption_"),
            "rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground",
          )}
        >
          {moodLabel(entry.mood)}
        </p>
        <p
          data-style-ref="Text_caption_"
          className={cn(bubbleStyle("Text_caption_"), "text-[11px] text-muted-foreground")}
        >
          {formatPreviewDate(entry.date)}
        </p>
      </div>
    </div>
  );
}

export default function DashboardJournalPreviewCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalPreviewEntry[]>([]);

  const loadEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await fetchJournalPreviewEntries(user.id);
      setEntries(rows);
    } catch (err) {
      console.error("Failed to load journal preview", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
    >
      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex items-center justify-between gap-3")}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 items-center gap-2")}
        >
          <span className={cn(bubbleStyle("Icon_primary_"), "shrink-0")} aria-hidden>
            <BookOpen className="h-5 w-5" />
          </span>
          <p
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold")}
          >
            Recent Journal
          </p>
        </div>

        <Link
          to="/journal"
          data-style-ref="Text_link_"
          className={cn(bubbleStyle("Text_link_"), "shrink-0 text-sm font-medium hover:underline")}
        >
          View all
        </Link>
      </div>

      <div
        data-style-ref="RepeatingGroup_list_"
        className={cn(bubbleStyle("RepeatingGroup_list_"), "flex flex-col")}
      >
        {loading ? (
          <div className="space-y-3 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : entries.length > 0 ? (
          entries.map((entry) => <JournalPreviewCell key={entry.id} entry={entry} />)
        ) : (
          <p
            data-style-ref="Text_body_"
            className={cn(
              bubbleStyle("Text_body_"),
              "py-2 text-center text-sm text-muted-foreground",
            )}
          >
            No entries yet
          </p>
        )}
      </div>
    </div>
  );
}
