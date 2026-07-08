import { type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHAT_MAIN_BUBBLE_ID,
  CHAT_MODULE_ID,
  CHAT_PAGE_TITLE_BUBBLE_ID,
  CHAT_PAGE_TITLE_ROW_BUBBLE_ID,
  CHAT_PANEL_MOUNT_BUBBLE_ID,
  CHAT_SIDEBAR_REGION_BUBBLE_ID,
  NEW_CONVERSATION_BTN_BUBBLE_ID,
} from "@/lib/chat/routes";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface ChatPageContentProps {
  sidebar: ReactNode;
  panel: ReactNode;
  onNewConversation?: () => void;
  className?: string;
}

export default function ChatPageContent({
  sidebar,
  panel,
  onNewConversation,
  className,
}: ChatPageContentProps) {
  return (
    <div
      data-bubble-id={CHAT_MAIN_BUBBLE_ID}
      data-module-owner={CHAT_MODULE_ID}
      className={cn("flex h-[calc(100vh-3.5rem)] flex-col md:flex-row", className)}
    >
      <aside
        data-bubble-id={CHAT_SIDEBAR_REGION_BUBBLE_ID}
        className="flex w-full shrink-0 flex-col border-border bg-card/40 md:w-64 md:border-r"
      >
        <div
          data-bubble-id={CHAT_PAGE_TITLE_ROW_BUBBLE_ID}
          className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <h2
            data-bubble-id={CHAT_PAGE_TITLE_BUBBLE_ID}
            className={bubbleStyle("Text_heading_3_")}
          >
            Conversations
          </h2>
          {onNewConversation ? (
            <Button
              type="button"
              data-bubble-id={NEW_CONVERSATION_BTN_BUBBLE_ID}
              onClick={onNewConversation}
              size="sm"
              className={cn(bubbleStyle("Button_primary_"), "w-full sm:w-auto")}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              New conversation
            </Button>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
      </aside>

      <div
        data-bubble-id={CHAT_PANEL_MOUNT_BUBBLE_ID}
        className="min-h-0 min-w-0 flex-1"
      >
        {panel}
      </div>
    </div>
  );
}
