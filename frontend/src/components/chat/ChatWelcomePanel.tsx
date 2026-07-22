import { cn } from "@/lib/utils";

import { ChatEmptyWelcome } from "./ChatEmptyWelcome";

export interface ChatWelcomePanelProps {
  className?: string;
}

/** Shown when no conversation is selected — matches Lovable empty-thread welcome. */
export default function ChatWelcomePanel({ className }: ChatWelcomePanelProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-y-auto", className)}>
      <ChatEmptyWelcome />
    </div>
  );
}
