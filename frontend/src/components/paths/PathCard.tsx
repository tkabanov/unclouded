import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { Button } from "@/components/ui/button";
import type { PathEnrollmentListItem } from "@/lib/dashboard/pathEnrollmentApi";
import { PATH_ENROLLMENT_STATUS_LABELS } from "@/lib/enums/pathEnrollment";
import { TIER_LABELS } from "@/lib/enums/tier";

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
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex h-full flex-col gap-4 p-5",
        className,
      )}
    >
      <header
        className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2")}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap items-center gap-2")}
        >
          <span
            className={cn(bubbleStyle("Group_badge_"), "text-xs capitalize")}
          >
            {enrollment.pillarLabel}
          </span>
          {enrollment.subMode ? (
            <span
              className={cn(bubbleStyle("Group_badge_"), "text-xs")}
            >
              {enrollment.subMode}
            </span>
          ) : null}
          <div
            className={cn(bubbleStyle("Group_transparent_"), "inline-flex")}
          >
            <span
              className={cn(bubbleStyle("Group_badge_primary_"), "text-xs capitalize")}
            >
              {TIER_LABELS[enrollment.tier]}
            </span>
          </div>
        </div>
      </header>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex-1")}
      >
        <h3
          className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
        >
          {enrollment.pathName}
        </h3>
      </div>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-1")}
      >
        <div className="w-full">
          <ProgressBar value={enrollment.progressPercent} />
        </div>
        <p
          className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
        >
          {enrollment.progressPercent}%
        </p>
      </div>

      <footer
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-1.5")}
        >
          <CheckCircle2
            className={cn(bubbleStyle("Icon_primary_"), "h-4 w-4 shrink-0")}
            aria-hidden
          />
          <span
            className={cn(bubbleStyle("Text_small_"), "text-xs capitalize text-muted-foreground")}
          >
            {statusLabel}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
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
