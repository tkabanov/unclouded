import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface ChatSuggestionCardProps {
  cardBubbleId: string;
  headerBubbleId: string;
  iconBubbleId: string;
  labelBubbleId: string;
  descBubbleId: string;
  actionBubbleId: string;
  icon: ReactNode;
  label: string;
  description: string;
  action: string;
  href: string;
  className?: string;
}

/**
 * Crisis resource prompt card (ai_RNbBHXcM / ai_RNbBHXcS / ai_RNbBHXcY groups).
 */
export default function ChatSuggestionCard({
  cardBubbleId,
  headerBubbleId,
  iconBubbleId,
  labelBubbleId,
  descBubbleId,
  actionBubbleId,
  icon,
  label,
  description,
  action,
  href,
  className,
}: ChatSuggestionCardProps) {
  return (
    <a
      data-bubble-id={cardBubbleId}
      href={href}
      className={cn(
        bubbleStyle("Group_card_muted_"),
        "flex w-full flex-col gap-2 rounded-xl p-3 transition-colors hover:bg-[var(--color_aiRNbAaxgt_default)]/80",
        className,
      )}
    >
      <div
        data-bubble-id={headerBubbleId}
        className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
      >
        <span
          data-bubble-id={iconBubbleId}
          className={cn(bubbleStyle("Icon_primary_"), "inline-flex shrink-0")}
          aria-hidden
        >
          {icon}
        </span>
        <span
          data-bubble-id={labelBubbleId}
          className={cn(bubbleStyle("Text_label_"), "text-xs font-semibold text-[var(--color_aiRNbAaxgu_default)]")}
        >
          {label}
        </span>
      </div>
      <p
        data-bubble-id={descBubbleId}
        className={cn(bubbleStyle("Text_caption_"), "text-xs text-[var(--color_aiRNbAaxgu_default)]")}
      >
        {description}
      </p>
      <span
        data-bubble-id={actionBubbleId}
        className={cn(bubbleStyle("Text_body_"), "text-sm font-bold text-[var(--color_primary_default)]")}
      >
        {action}
      </span>
    </a>
  );
}
