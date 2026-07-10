import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface ChatSuggestionCardProps {
  icon: ReactNode;
  label: string;
  description: string;
  action: string;
  href: string;
  className?: string;
}

export default function ChatSuggestionCard({
  icon,
  label,
  description,
  action,
  href,
  className,
}: ChatSuggestionCardProps) {
  return (
    <a
      href={href}
      className={cn(
        bubbleStyle("Group_card_muted_"),
        "flex w-full flex-col gap-2 rounded-xl p-3 transition-colors hover:bg-secondary/80",
        className,
      )}
    >
      <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}>
        <span className={cn(bubbleStyle("Icon_primary_"), "inline-flex shrink-0")} aria-hidden>
          {icon}
        </span>
        <span
          className={cn(
            bubbleStyle("Text_label_"),
            "text-xs font-semibold text-secondary-foreground",
          )}
        >
          {label}
        </span>
      </div>
      <p className={cn(bubbleStyle("Text_caption_"), "text-xs text-secondary-foreground")}>
        {description}
      </p>
      <span className={cn(bubbleStyle("Text_body_"), "text-sm font-bold text-primary")}>
        {action}
      </span>
    </a>
  );
}
