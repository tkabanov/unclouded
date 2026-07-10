import { CalendarDays, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RelapseEventListItem } from "@/lib/journal/relapseEventsApi";
import { bubbleStyle } from "@/styles";

function formatEventDate(value: string | null): string {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface RelapseEventCardProps {
  event: RelapseEventListItem;
  onEditRelapse: (event: RelapseEventListItem) => void;
  className?: string;
}

export default function RelapseEventCard({
  event,
  onEditRelapse,
  className,
}: RelapseEventCardProps) {
  return (
    <article
      data-style-ref="Group_panel_"
      className={cn(
        bubbleStyle("Group_panel_"),
        "flex w-full flex-col gap-3 rounded-xl border p-4 sm:p-5",
        className,
      )}
    >
      <div
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex items-start justify-between gap-3",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 flex-1 items-center gap-3")}
        >
          <span
            data-style-ref="Icon_primary_"
            className={cn(bubbleStyle("Icon_primary_"), "shrink-0")}
            aria-hidden
          >
            <CalendarDays className="h-5 w-5" />
          </span>
          <p
            data-style-ref="Text_label_"
            className={cn(bubbleStyle("Text_label_"), "text-sm font-semibold")}
          >
            {formatEventDate(event.eventDate)}
          </p>
        </div>

        <div
          className={cn(bubbleStyle("Group_transparent_"), "shrink-0")}
        >
          <button
            type="button"
            data-style-ref="Button_icon_"
            className={cn(
              bubbleStyle("Button_icon_"),
              "inline-flex h-9 w-9 items-center justify-center rounded-md",
            )}
            aria-label="Edit recovery event"
            onClick={() => onEditRelapse(event)}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {event.notes ? (
        <p
          data-style-ref="Text_body_muted_"
          className={cn(
            bubbleStyle("Text_body_muted_"),
            "whitespace-pre-wrap text-sm text-muted-foreground",
          )}
        >
          {event.notes}
        </p>
      ) : null}
    </article>
  );
}
