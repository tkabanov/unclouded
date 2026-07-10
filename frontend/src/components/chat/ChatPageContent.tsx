import { type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAT_MODULE_ID } from "@/lib/chat/routes";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface ChatPageContentProps {
  sidebar: ReactNode;
  panel: ReactNode;
  onNewConversation?: () => void;
  newConversationDisabled?: boolean;
  className?: string;
}

export default function ChatPageContent({
  sidebar,
  panel,
  onNewConversation,
  newConversationDisabled = false,
  className,
}: ChatPageContentProps) {
  return (
    <div
      data-module-owner={CHAT_MODULE_ID}
      className={cn("flex h-[calc(100vh-3.5rem)] flex-col md:flex-row", className)}
    >
      <aside
        className="flex w-full shrink-0 flex-col overflow-hidden border-border bg-card/40 md:w-72 md:max-w-72 md:border-r"
      >
        <div className="flex flex-col gap-2 border-b border-border p-4">
          <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold")}>
            Conversations
          </h2>
          {onNewConversation ? (
            <Button
              type="button"
              onClick={onNewConversation}
              disabled={newConversationDisabled}
              size="sm"
              className={cn(bubbleStyle("Button_primary_"), "w-full justify-center")}
            >
              <Plus className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
              New conversation
            </Button>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {panel}
      </div>
    </div>
  );
}
