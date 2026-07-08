import { cn } from "@/lib/utils";

import { CHAT_BEHAVIOR_HTML } from "./types";

export type ChatFloatingDisclaimerProps = {
  collapsed?: boolean;
  className?: string;
};

/**
 * FloatingGroup (bTIUh) with HTML chat-behavior region (bTIne).
 * Anchored above the composer as an overlay per IR z-index stacking.
 */
export function ChatFloatingDisclaimer({
  collapsed = false,
  className,
}: ChatFloatingDisclaimerProps) {
  if (collapsed) {
    return null;
  }

  return (
    <div
      data-bubble-id="bTIUh"
      className={cn(
        "pointer-events-none absolute bottom-full left-0 right-0 z-[4] mb-2",
        className,
      )}
    >
      <div
        data-bubble-id="bTIne"
        className="sr-only"
        dangerouslySetInnerHTML={{ __html: CHAT_BEHAVIOR_HTML }}
      />
    </div>
  );
}
