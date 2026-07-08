import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface CrisisHotlineRowProps {
  groupId: string;
  iconId: string;
  textGroupId: string;
  nameId: string;
  detailId: string;
  icon: ReactNode;
  name: string;
  detail: string;
  href: string;
}

export function CrisisHotlineRow({
  groupId,
  iconId,
  textGroupId,
  nameId,
  detailId,
  icon,
  name,
  detail,
  href,
}: CrisisHotlineRowProps) {
  return (
    <a
      data-bubble-id={groupId}
      href={href}
      className={cn(
        bubbleStyle("Group_transparent_"),
        "flex min-w-[140px] flex-1 items-start gap-2 rounded-lg p-2 transition-colors hover:bg-accent/50",
      )}
    >
      <span data-bubble-id={iconId} className={cn(bubbleStyle("Icon_primary_"), "mt-0.5 shrink-0")} aria-hidden>
        {icon}
      </span>
      <div data-bubble-id={textGroupId} className={cn(bubbleStyle("Group_transparent_"), "min-w-0 flex-col gap-0.5")}>
        <span
          data-bubble-id={nameId}
          className={cn(bubbleStyle("Text_label_"), "block text-sm font-semibold text-foreground")}
        >
          {name}
        </span>
        <span data-bubble-id={detailId} className={cn(bubbleStyle("Text_small_"), "block text-xs text-primary")}>
          {detail}
        </span>
      </div>
    </a>
  );
}
