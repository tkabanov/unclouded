import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/chat/chatConversationsApi";

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
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(conversation);
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors",
        isActive ? "bg-accent text-foreground" : "hover:bg-accent/50",
        className,
      )}
    >
      <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm">
        {conversation.title}
        {conversation.sessionType === "voice" ? (
          <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
            Voice
          </span>
        ) : null}
      </span>

      <div
        className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Rename conversation"
          onClick={() => onRenameRequest(conversation)}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground transition-opacity hover:text-destructive"
          aria-label="Delete conversation"
          onClick={() => onDeleteRequest(conversation)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
