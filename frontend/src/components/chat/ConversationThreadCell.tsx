import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/chat/chatConversationsApi";
import { bubbleStyle } from "@/styles";

function formatModifiedDate(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export interface ConversationThreadCellProps {
  conversation: ConversationListItem;
  isActive: boolean;
  onSelect: (conversation: ConversationListItem) => void;
  onRenameRequest: (conversation: ConversationListItem) => void;
  onDeleteRequest: (conversation: ConversationListItem) => void;
  className?: string;
}

export default function ConversationThreadCell({
  conversation,
  isActive,
  onSelect,
  onRenameRequest,
  onDeleteRequest,
  className,
}: ConversationThreadCellProps) {
  const formattedDate = formatModifiedDate(conversation.modifiedDate);

  return (
    <div
      className={cn(
        "group rounded-lg px-3 py-2.5 transition-colors",
        isActive ? "bg-accent text-foreground" : "hover:bg-accent/50",
        className,
      )}
    >
      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex items-start gap-2")}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "min-w-0 flex-1")}
        >
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              data-style-ref="Button_ghost_"
              className={cn(
                bubbleStyle("Button_ghost_"),
                "min-w-0 flex-1 text-left",
              )}
              onClick={() => onSelect(conversation)}
            >
              <span
                data-style-ref="Text_body_"
                className={cn(bubbleStyle("Text_body_"), "block truncate text-sm font-medium")}
              >
                {conversation.title}
                {conversation.sessionType === "voice" ? (
                  <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                    Voice
                  </span>
                ) : null}
              </span>
              <span
                data-style-ref="Text_caption_"
                className={cn(
                  bubbleStyle("Text_caption_"),
                  "mt-0.5 block line-clamp-2 text-xs text-muted-foreground",
                )}
              >
                {conversation.previewText}
              </span>
            </button>
            {formattedDate ? (
              <time
                data-style-ref="Text_caption_"
                className={cn(
                  bubbleStyle("Text_caption_"),
                  "shrink-0 text-[11px] text-muted-foreground",
                )}
                dateTime={conversation.modifiedDate ?? undefined}
              >
                {formattedDate}
              </time>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            bubbleStyle("Group_transparent_"),
            "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            data-style-ref="Button_icon_"
            className={cn(
              bubbleStyle("Button_icon_"),
              "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground",
            )}
            aria-label="Rename conversation"
            onClick={() => onRenameRequest(conversation)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            data-style-ref="Button_icon_"
            className={cn(
              bubbleStyle("Button_icon_"),
              "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive",
            )}
            aria-label="Delete conversation"
            onClick={() => onDeleteRequest(conversation)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
