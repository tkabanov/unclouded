import { BookOpenText, Plus, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalEntryListItem } from "@/lib/journal/journalEntriesApi";
import JournalEntryCard from "@/components/journal/JournalEntryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { bubbleStyle } from "@/styles";

export interface JournalEntriesTabProps {
  entries: JournalEntryListItem[];
  loading: boolean;
  onNewEntry: () => void;
  onViewEntry: (entry: JournalEntryListItem) => void;
  className?: string;
}

export default function JournalEntriesTab({
  entries,
  loading,
  onNewEntry,
  onViewEntry,
  className,
}: JournalEntriesTabProps) {
  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <div
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
        >
          <span
            data-style-ref="Icon_primary_"
            className={cn(bubbleStyle("Icon_primary_"), "shrink-0")}
            aria-hidden
          >
            <BookOpenText className="h-5 w-5" />
          </span>
          <span
            data-style-ref="Text_label_"
            className={cn(bubbleStyle("Text_label_"), "text-base font-semibold")}
          >
            Your Entries
            {!loading ? (
              <span className="ml-1.5 font-normal text-muted-foreground">({entries.length})</span>
            ) : null}
          </span>
        </div>

        <button
          type="button"
          data-style-ref="Button_primary_"
          className={cn(bubbleStyle("Button_primary_"), "inline-flex shrink-0 items-center gap-1.5")}
          onClick={onNewEntry}
        >
          <Plus className="h-4 w-4" aria-hidden />
          New Entry
        </button>
      </div>

      <div
        data-style-ref="RepeatingGroup_list_"
        className={cn(bubbleStyle("RepeatingGroup_list_"), "flex w-full flex-col gap-4")}
      >
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn(bubbleStyle("Group_card_"), "rounded-xl p-6")}>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-4 h-6 w-1/2" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div
            className={cn(
              bubbleStyle("Group_card_muted_"),
              "rounded-xl border border-dashed px-6 py-16 text-center",
            )}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Smile className="h-7 w-7 text-primary" />
            </div>
            <h3
              className={cn(bubbleStyle("Text_heading_3_"), "mt-4 text-lg font-semibold")}
            >
              Your journal is a blank page
            </h3>
            <p className={cn(bubbleStyle("Text_body_muted_"), "mx-auto mt-1 max-w-sm text-sm")}>
              Capture a thought, a win, or how today felt. Small notes add up to real clarity.
            </p>
            <button
              type="button"
              data-style-ref="Button_primary_"
              className={cn(
                bubbleStyle("Button_primary_"),
                "mt-6 inline-flex items-center gap-1.5",
              )}
              onClick={onNewEntry}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Write your first entry
            </button>
          </div>
        ) : (
          entries.map((entry) => (
            <JournalEntryCard key={entry.id} entry={entry} onViewEntry={onViewEntry} />
          ))
        )}
      </div>
    </div>
  );
}
