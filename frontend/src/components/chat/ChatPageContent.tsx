import { type ReactNode, useEffect, useState } from "react";
import { Lock, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatConversationParam } from "@/lib/chat/chatRouteStore";
import { CHAT_MODULE_ID } from "@/lib/chat/routes";
import { cn } from "@/lib/utils";

export interface ChatPageContentProps {
  sidebar: ReactNode;
  panel: ReactNode;
  onNewConversation?: () => void;
  newConversationDisabled?: boolean;
  /** Free-tier monthly cap reached: still clickable, opens the upgrade dialog. */
  newConversationLocked?: boolean;
  className?: string;
}

function ConversationListHeader({
  onNewConversation,
  newConversationDisabled,
  newConversationLocked,
}: {
  onNewConversation?: () => void;
  newConversationDisabled: boolean;
  newConversationLocked: boolean;
}) {
  return (
    <div className="border-b border-border p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Conversations</h2>
      {onNewConversation ? (
        <Button
          type="button"
          onClick={onNewConversation}
          disabled={newConversationDisabled}
          variant={newConversationLocked ? "outline" : "cta"}
          size="sm"
          className="w-full"
        >
          {newConversationLocked ? (
            <Lock className="mr-1.5 h-4 w-4" aria-hidden />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          )}
          New conversation
        </Button>
      ) : null}
    </div>
  );
}

export default function ChatPageContent({
  sidebar,
  panel,
  onNewConversation,
  newConversationDisabled = false,
  newConversationLocked = false,
  className,
}: ChatPageContentProps) {
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { conversationId } = useChatConversationParam();

  // Selecting a conversation should return the mobile viewer to the chat
  // panel instead of leaving the conversations sheet open over it.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [conversationId]);

  const sidebarBody = (
    <>
      <ConversationListHeader
        onNewConversation={onNewConversation}
        newConversationDisabled={newConversationDisabled}
        newConversationLocked={newConversationLocked}
      />
      <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
      <p className="border-t border-border p-3 text-[11px] text-muted-foreground">
        Conversations are saved to your account and private to you.
      </p>
    </>
  );

  return (
    <div
      data-module-owner={CHAT_MODULE_ID}
      className={cn("flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top))]", className)}
    >
      {isMobile ? (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="flex w-4/5 flex-col p-0 sm:max-w-xs">
            <SheetTitle className="sr-only">Conversations</SheetTitle>
            {sidebarBody}
          </SheetContent>
        </Sheet>
      ) : (
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card/40">
          {sidebarBody}
        </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {isMobile ? (
          <div className="flex shrink-0 items-center border-b border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open conversations"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{panel}</div>
      </div>
    </div>
  );
}
