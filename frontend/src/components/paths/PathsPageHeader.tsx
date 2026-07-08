import { cn } from "@/lib/utils";
import {
  PATHS_PAGE_HEADER_BUBBLE_ID,
  PATHS_PAGE_SUBTITLE_BUBBLE_ID,
  PATHS_PAGE_TITLE_BUBBLE_ID,
  PATHS_PAGE_TITLE_GROUP_BUBBLE_ID,
} from "@/lib/paths/routes";
import { bubbleStyle } from "@/styles";

export interface PathsPageHeaderProps {
  className?: string;
}

export default function PathsPageHeader({ className }: PathsPageHeaderProps) {
  return (
    <header
      data-bubble-id={PATHS_PAGE_HEADER_BUBBLE_ID}
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        data-bubble-id={PATHS_PAGE_TITLE_GROUP_BUBBLE_ID}
        className="flex flex-col gap-2"
      >
        <h1
          data-bubble-id={PATHS_PAGE_TITLE_BUBBLE_ID}
          className={bubbleStyle("Text_heading_1_")}
        >
          Paths &amp; Resources
        </h1>
        <p
          data-bubble-id={PATHS_PAGE_SUBTITLE_BUBBLE_ID}
          className={bubbleStyle("Text_body_muted_")}
        >
          Guided coaching paths and curated resources tailored to your journey.
        </p>
      </div>
    </header>
  );
}
