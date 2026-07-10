import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface PathsPageHeaderProps {
  className?: string;
}

export default function PathsPageHeader({ className }: PathsPageHeaderProps) {
  return (
    <header
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        className="flex flex-col gap-2"
      >
        <h1
          className={bubbleStyle("Text_heading_1_")}
        >
          Paths &amp; Resources
        </h1>
        <p
          className={bubbleStyle("Text_body_muted_")}
        >
          Guided coaching paths and curated resources tailored to your journey.
        </p>
      </div>
    </header>
  );
}
