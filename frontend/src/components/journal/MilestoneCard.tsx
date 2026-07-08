import { Pencil, Trash2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MILESTONE_CARD_ACTIONS_BUBBLE_ID,
  MILESTONE_CARD_DATE_BUBBLE_ID,
  MILESTONE_CARD_DELETE_BTN_BUBBLE_ID,
  MILESTONE_CARD_DESCRIPTION_BUBBLE_ID,
  MILESTONE_CARD_EDIT_BTN_BUBBLE_ID,
  MILESTONE_CARD_HEADER_BUBBLE_ID,
  MILESTONE_CARD_ICON_BUBBLE_ID,
  MILESTONE_CARD_ICON_WRAP_BUBBLE_ID,
  MILESTONE_CARD_META_BUBBLE_ID,
  MILESTONE_CARD_TEMPLATE_BUBBLE_ID,
  MILESTONE_CARD_TITLE_BUBBLE_ID,
  MILESTONE_CARD_TITLE_ROW_BUBBLE_ID,
} from "@/lib/journal/routes";
import type { MilestoneListItem } from "@/lib/journal/milestonesApi";
import { bubbleStyle } from "@/styles";

function formatAchievedDate(value: string | null): string {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface MilestoneCardProps {
  milestone: MilestoneListItem;
  onEditMilestone: (milestone: MilestoneListItem) => void;
  className?: string;
}

export default function MilestoneCard({
  milestone,
  onEditMilestone,
  className,
}: MilestoneCardProps) {
  return (
    <article
      data-bubble-id={MILESTONE_CARD_TEMPLATE_BUBBLE_ID}
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-3 p-5 sm:p-6", className)}
    >
      <div
        data-bubble-id={MILESTONE_CARD_HEADER_BUBBLE_ID}
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex items-start justify-between gap-3",
        )}
      >
        <div
          data-bubble-id={MILESTONE_CARD_META_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 flex-1 gap-3")}
        >
          <div
            data-bubble-id={MILESTONE_CARD_ICON_WRAP_BUBBLE_ID}
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10",
            )}
          >
            <span
              data-bubble-id={MILESTONE_CARD_ICON_BUBBLE_ID}
              data-style-ref="Icon_primary_"
              className={cn(bubbleStyle("Icon_primary_"), "shrink-0")}
              aria-hidden
            >
              <Trophy className="h-5 w-5" />
            </span>
          </div>

          <div
            data-bubble-id={MILESTONE_CARD_TITLE_ROW_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "min-w-0 flex-1")}
          >
            <h2
              data-bubble-id={MILESTONE_CARD_TITLE_BUBBLE_ID}
              data-style-ref="Text_heading_3_"
              className={cn(bubbleStyle("Text_heading_3_"), "text-lg font-semibold")}
            >
              {milestone.title_text}
            </h2>
            <p
              data-bubble-id={MILESTONE_CARD_DATE_BUBBLE_ID}
              data-style-ref="Text_caption_"
              className={cn(bubbleStyle("Text_caption_"), "mt-1 text-xs text-muted-foreground")}
            >
              Achieved {formatAchievedDate(milestone.achieved_at_date)}
            </p>
          </div>
        </div>

        <div
          data-bubble-id={MILESTONE_CARD_ACTIONS_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex shrink-0 items-center gap-1")}
        >
          <button
            type="button"
            data-bubble-id={MILESTONE_CARD_EDIT_BTN_BUBBLE_ID}
            data-style-ref="Button_icon_"
            className={cn(
              bubbleStyle("Button_icon_"),
              "inline-flex h-9 w-9 items-center justify-center rounded-md",
            )}
            aria-label="Edit milestone"
            onClick={() => onEditMilestone(milestone)}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            data-bubble-id={MILESTONE_CARD_DELETE_BTN_BUBBLE_ID}
            data-style-ref="Button_icon_"
            className={cn(
              bubbleStyle("Button_icon_"),
              "inline-flex h-9 w-9 items-center justify-center rounded-md text-destructive",
            )}
            aria-label="Edit milestone options"
            onClick={() => onEditMilestone(milestone)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {milestone.description_text ? (
        <p
          data-bubble-id={MILESTONE_CARD_DESCRIPTION_BUBBLE_ID}
          data-style-ref="Text_body_muted_"
          className={cn(
            bubbleStyle("Text_body_muted_"),
            "whitespace-pre-wrap text-sm text-muted-foreground",
          )}
        >
          {milestone.description_text}
        </p>
      ) : null}
    </article>
  );
}
