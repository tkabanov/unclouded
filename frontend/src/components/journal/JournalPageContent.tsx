import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface JournalPageContentProps {
  children: ReactNode;
  className?: string;
}

export default function JournalPageContent({
  children,
  className,
}: JournalPageContentProps) {
  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <h1 className={bubbleStyle("Text_heading_1_")}>Journal</h1>
          <p className={bubbleStyle("Text_body_muted_")}>
            Reflect, grow, and celebrate your progress — private to you.
          </p>
        </div>
      </header>

      {children}
    </div>
  );
}
