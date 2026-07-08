import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { Button } from "@/components/ui/button";
import type { PathEnrollmentListItem } from "@/lib/dashboard/pathEnrollmentApi";
import { PATH_ENROLLMENT_STATUS_LABELS } from "@/lib/enums/pathEnrollment";
import { TIER_LABELS } from "@/lib/enums/tier";
import {
  PATHS_GRID_CELL_BUBBLE_ID,
  PATH_CARD_BADGES_ROW_BUBBLE_ID,
  PATH_CARD_BODY_BUBBLE_ID,
  PATH_CARD_ENROLLED_ICON_BUBBLE_ID,
  PATH_CARD_ENROLLED_INDICATOR_BUBBLE_ID,
  PATH_CARD_ENROLLED_TEXT_BUBBLE_ID,
  PATH_CARD_FOOTER_BUBBLE_ID,
  PATH_CARD_HEADER_BUBBLE_ID,
  PATH_CARD_PILLAR_BADGE_BUBBLE_ID,
  PATH_CARD_PROGRESS_BAR_WRAP_BUBBLE_ID,
  PATH_CARD_PROGRESS_PCT_BUBBLE_ID,
  PATH_CARD_PROGRESS_WRAP_BUBBLE_ID,
  PATH_CARD_SUBMODE_BADGE_BUBBLE_ID,
  PATH_CARD_TIER_BADGE_BUBBLE_ID,
  PATH_CARD_TIER_BADGE_WRAP_BUBBLE_ID,
  PATH_CARD_TITLE_BUBBLE_ID,
  PATH_CARD_VIEW_DETAILS_BTN_BUBBLE_ID,
} from "@/lib/paths/routes";

export interface PathCardProps {
  enrollment: PathEnrollmentListItem;
  onViewDetails?: (enrollment: PathEnrollmentListItem) => void;
  className?: string;
}

export default function PathCard({
  enrollment,
  onViewDetails,
  className,
}: PathCardProps) {
  const statusLabel = PATH_ENROLLMENT_STATUS_LABELS[enrollment.status];

  return (
    <article
      data-bubble-id={PATHS_GRID_CELL_BUBBLE_ID}
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex h-full flex-col gap-4 p-5",
        className,
      )}
    >
      <header
        data-bubble-id={PATH_CARD_HEADER_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2")}
      >
        <div
          data-bubble-id={PATH_CARD_BADGES_ROW_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap items-center gap-2")}
        >
          <span
            data-bubble-id={PATH_CARD_PILLAR_BADGE_BUBBLE_ID}
            className={cn(bubbleStyle("Group_badge_"), "text-xs capitalize")}
          >
            {enrollment.pillarLabel}
          </span>
          {enrollment.subMode ? (
            <span
              data-bubble-id={PATH_CARD_SUBMODE_BADGE_BUBBLE_ID}
              className={cn(bubbleStyle("Group_badge_"), "text-xs")}
            >
              {enrollment.subMode}
            </span>
          ) : null}
          <div
            data-bubble-id={PATH_CARD_TIER_BADGE_WRAP_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "inline-flex")}
          >
            <span
              data-bubble-id={PATH_CARD_TIER_BADGE_BUBBLE_ID}
              className={cn(bubbleStyle("Group_badge_primary_"), "text-xs capitalize")}
            >
              {TIER_LABELS[enrollment.tier]}
            </span>
          </div>
        </div>
      </header>

      <div
        data-bubble-id={PATH_CARD_BODY_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex-1")}
      >
        <h3
          data-bubble-id={PATH_CARD_TITLE_BUBBLE_ID}
          className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
        >
          {enrollment.pathName}
        </h3>
      </div>

      <div
        data-bubble-id={PATH_CARD_PROGRESS_WRAP_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-1")}
      >
        <div data-bubble-id={PATH_CARD_PROGRESS_BAR_WRAP_BUBBLE_ID} className="w-full">
          <ProgressBar value={enrollment.progressPercent} />
        </div>
        <p
          data-bubble-id={PATH_CARD_PROGRESS_PCT_BUBBLE_ID}
          className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
        >
          {enrollment.progressPercent}%
        </p>
      </div>

      <footer
        data-bubble-id={PATH_CARD_FOOTER_BUBBLE_ID}
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div
          data-bubble-id={PATH_CARD_ENROLLED_INDICATOR_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-1.5")}
        >
          <CheckCircle2
            data-bubble-id={PATH_CARD_ENROLLED_ICON_BUBBLE_ID}
            className={cn(bubbleStyle("Icon_primary_"), "h-4 w-4 shrink-0")}
            aria-hidden
          />
          <span
            data-bubble-id={PATH_CARD_ENROLLED_TEXT_BUBBLE_ID}
            className={cn(bubbleStyle("Text_small_"), "text-xs capitalize text-muted-foreground")}
          >
            {statusLabel}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          data-bubble-id={PATH_CARD_VIEW_DETAILS_BTN_BUBBLE_ID}
          data-style-ref="Button_accent_"
          className={cn(bubbleStyle("Button_accent_"), "shrink-0")}
          onClick={() => onViewDetails?.(enrollment)}
        >
          View Path
        </Button>
      </footer>
    </article>
  );
}
