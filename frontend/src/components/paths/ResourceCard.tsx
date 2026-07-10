import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { Button } from "@/components/ui/button";
import type { ResourceListItem } from "@/lib/paths/pathsResourcesApi";

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
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex h-full flex-col gap-4 p-5",
        className,
      )}
    >
      <header
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-wrap items-center justify-between gap-2",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap items-center gap-2")}
        >
          {resource.primaryModeTag ? (
            <span
              className={cn(bubbleStyle("Group_badge_"), "text-xs")}
            >
              {resource.primaryModeTag}
            </span>
          ) : null}
          {resource.subModeTag ? (
            <span
              className={cn(bubbleStyle("Group_badge_"), "text-xs")}
            >
              {resource.subModeTag}
            </span>
          ) : null}
        </div>
        {resource.isFree ? (
          <span
            className={cn(bubbleStyle("Group_badge_primary_"), "text-xs")}
          >
            Free
          </span>
        ) : null}
      </header>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex flex-1 flex-col gap-2")}
      >
        <h3
          className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
        >
          {resource.title}
        </h3>
        {resource.content ? (
          <p
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm leading-relaxed")}
          >
            {resource.content}
          </p>
        ) : null}
      </div>

      {resource.sensitivityFlag ? (
        <div
          className={cn(bubbleStyle("Group_transparent_"), "w-full")}
        >
          <div
            className={cn(bubbleStyle("Group_transparent_"), "inline-flex items-center gap-1.5")}
          >
            <AlertTriangle
              className={cn(bubbleStyle("Icon_muted_"), "h-3.5 w-3.5 shrink-0")}
              aria-hidden
            />
            <span
              className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
            >
              {resource.sensitivityFlag}
            </span>
          </div>
        </div>
      ) : null}

      <footer
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <p
          className={cn(bubbleStyle("Text_caption_"), "text-xs text-muted-foreground")}
        >
          Coaching-only resource
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(bubbleStyle("Button_secondary_"), "shrink-0")}
          onClick={() => onViewResource?.(resource)}
        >
          View Resource
        </Button>
      </footer>
    </article>
  );
}
