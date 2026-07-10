import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/lib/bubbleStyles";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OFFLINE_COPY = "Offline - you are using cached data.";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      data-style-ref="Group_section_"
      className={cn(
        bubbleStyle("Group_section_"),
        "flex w-full flex-row items-center justify-center gap-2 shrink-0",
      )}
      role="status"
      aria-live="polite"
    >
      <CloudOff
        data-style-ref="Icon_muted_"
        aria-hidden
        className={cn(bubbleStyle("Icon_muted_"), "h-5 w-5 shrink-0")}
      />
      <span
        data-style-ref="Text_caption_"
        className={bubbleStyle("Text_caption_")}
      >
        {OFFLINE_COPY}
      </span>
    </div>
  );
}
