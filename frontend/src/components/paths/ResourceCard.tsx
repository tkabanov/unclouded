import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { Button } from "@/components/ui/button";
import type { ResourceListItem } from "@/lib/paths/pathsResourcesApi";
import {
  PATHS_RESOURCE_BODY_BUBBLE_ID,
  PATHS_RESOURCE_CELL_BUBBLE_ID,
  PATHS_RESOURCE_CONTENT_BUBBLE_ID,
  PATHS_RESOURCE_DISCLAIMER_BUBBLE_ID,
  PATHS_RESOURCE_FOOTER_BUBBLE_ID,
  PATHS_RESOURCE_FREE_BADGE_BUBBLE_ID,
  PATHS_RESOURCE_HEADER_BUBBLE_ID,
  PATHS_RESOURCE_PRIMARY_TAG_BUBBLE_ID,
  PATHS_RESOURCE_SENSITIVITY_BADGE_BUBBLE_ID,
  PATHS_RESOURCE_SENSITIVITY_ICON_BUBBLE_ID,
  PATHS_RESOURCE_SENSITIVITY_TEXT_BUBBLE_ID,
  PATHS_RESOURCE_SENSITIVITY_WRAP_BUBBLE_ID,
  PATHS_RESOURCE_SUBMODE_TAG_BUBBLE_ID,
  PATHS_RESOURCE_TAGS_ROW_BUBBLE_ID,
  PATHS_RESOURCE_TITLE_BUBBLE_ID,
  PATHS_RESOURCE_VIEW_BTN_BUBBLE_ID,
} from "@/lib/paths/routes";

export interface ResourceCardProps {
  resource: ResourceListItem;
  onViewResource?: (resource: ResourceListItem) => void;
  className?: string;
}

export default function ResourceCard({
  resource,
  onViewResource,
  className,
}: ResourceCardProps) {
  return (
    <article
      data-bubble-id={PATHS_RESOURCE_CELL_BUBBLE_ID}
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex h-full flex-col gap-4 p-5",
        className,
      )}
    >
      <header
        data-bubble-id={PATHS_RESOURCE_HEADER_BUBBLE_ID}
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-wrap items-center justify-between gap-2",
        )}
      >
        <div
          data-bubble-id={PATHS_RESOURCE_TAGS_ROW_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap items-center gap-2")}
        >
          {resource.primaryModeTag ? (
            <span
              data-bubble-id={PATHS_RESOURCE_PRIMARY_TAG_BUBBLE_ID}
              className={cn(bubbleStyle("Group_badge_"), "text-xs")}
            >
              {resource.primaryModeTag}
            </span>
          ) : null}
          {resource.subModeTag ? (
            <span
              data-bubble-id={PATHS_RESOURCE_SUBMODE_TAG_BUBBLE_ID}
              className={cn(bubbleStyle("Group_badge_"), "text-xs")}
            >
              {resource.subModeTag}
            </span>
          ) : null}
        </div>
        {resource.isFree ? (
          <span
            data-bubble-id={PATHS_RESOURCE_FREE_BADGE_BUBBLE_ID}
            className={cn(bubbleStyle("Group_badge_primary_"), "text-xs")}
          >
            Free
          </span>
        ) : null}
      </header>

      <div
        data-bubble-id={PATHS_RESOURCE_BODY_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex flex-1 flex-col gap-2")}
      >
        <h3
          data-bubble-id={PATHS_RESOURCE_TITLE_BUBBLE_ID}
          className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
        >
          {resource.title}
        </h3>
        {resource.content ? (
          <p
            data-bubble-id={PATHS_RESOURCE_CONTENT_BUBBLE_ID}
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm leading-relaxed")}
          >
            {resource.content}
          </p>
        ) : null}
      </div>

      {resource.sensitivityFlag ? (
        <div
          data-bubble-id={PATHS_RESOURCE_SENSITIVITY_WRAP_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "w-full")}
        >
          <div
            data-bubble-id={PATHS_RESOURCE_SENSITIVITY_BADGE_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "inline-flex items-center gap-1.5")}
          >
            <AlertTriangle
              data-bubble-id={PATHS_RESOURCE_SENSITIVITY_ICON_BUBBLE_ID}
              className={cn(bubbleStyle("Icon_muted_"), "h-3.5 w-3.5 shrink-0")}
              aria-hidden
            />
            <span
              data-bubble-id={PATHS_RESOURCE_SENSITIVITY_TEXT_BUBBLE_ID}
              className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
            >
              {resource.sensitivityFlag}
            </span>
          </div>
        </div>
      ) : null}

      <footer
        data-bubble-id={PATHS_RESOURCE_FOOTER_BUBBLE_ID}
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <p
          data-bubble-id={PATHS_RESOURCE_DISCLAIMER_BUBBLE_ID}
          className={cn(bubbleStyle("Text_caption_"), "text-xs text-muted-foreground")}
        >
          Coaching-only resource
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-bubble-id={PATHS_RESOURCE_VIEW_BTN_BUBBLE_ID}
          className={cn(bubbleStyle("Button_secondary_"), "shrink-0")}
          onClick={() => onViewResource?.(resource)}
        >
          View Resource
        </Button>
      </footer>
    </article>
  );
}
