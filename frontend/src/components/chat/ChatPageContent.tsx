import { type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAT_MODULE_ID } from "@/lib/chat/routes";
import { cn } from "@/lib/utils";

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
      className={cn("flex h-[calc(100vh-3.5rem)]", className)}
    >
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card/40">
        <div className="border-b border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Conversations</h2>
          {onNewConversation ? (
            <Button
              type="button"
              onClick={onNewConversation}
              disabled={newConversationDisabled}
              variant="cta"
              size="sm"
              className="w-full"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              New conversation
            </Button>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>

        <p className="border-t border-border p-3 text-[11px] text-muted-foreground">
          Conversations are saved to your account and private to you.
        </p>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{panel}</div>
    </div>
  );
}
