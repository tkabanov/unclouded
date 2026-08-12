import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { fetchChatPreview } from "@/lib/dashboard/chatPreviewApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const CHAT_PROMPT_CHIPS = [
  { label: "Plan my day", href: "/chat" },
  { label: "Reflect on this week", href: "/chat" },
  { label: "Set a new goal", href: "/chat" },
] as const;

export default function DashboardChatPreviewCard() {
  const { user } = useAuth();
  const { profile } = useDashboardUserContext();
  const [loading, setLoading] = useState(true);
  const [lastMessageText, setLastMessageText] = useState("");

  const loadPreview = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const preview = await fetchChatPreview(user.id, profile?.onboardingData ?? null);
      setLastMessageText(preview.lastMessageText);
    } catch (err) {
      console.error("Failed to load chat preview", err);
      setLastMessageText(
        "Here whenever you need to think out loud — start a conversation when you're ready.",
      );
    } finally {
      setLoading(false);
    }
  }, [user, profile?.onboardingData]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold leading-tight")}
          >
            AI coach chat
          </p>
        </div>

        <Link
          to="/chat"
          data-style-ref="Text_link_"
          className={cn(
            bubbleStyle("Text_link_"),
            "shrink-0 text-sm font-medium hover:underline",
          )}
        >
          Open chat
        </Link>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-primary/5 px-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-50 dark:bg-teal-900/30">
          <img
            src="/kota-avatar.png"
            alt=""
            className="h-9 w-9 object-cover"
          />
        </div>

        {loading ? (
          <Skeleton className="mt-1 h-4 w-full" />
        ) : (
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
            {lastMessageText}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p
          data-style-ref="Text_small_"
          className={cn(
            bubbleStyle("Text_small_"),
            "text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
          )}
        >
          Quick start
        </p>

        <div className="flex flex-wrap gap-1.5">
          {CHAT_PROMPT_CHIPS.map((chip) => (
            <Link
              key={chip.label}
              to={chip.href}
              data-style-ref="Group_chip_"
              className={cn(
                bubbleStyle("Group_chip_"),
                "inline-flex rounded-md text-xs text-foreground no-underline transition-colors",
              )}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>

      <Button asChild type="button" className="h-10 w-full gap-2">
        <Link to="/chat">
          <MessageCircle className="h-4 w-4" aria-hidden />
          Open chat
        </Link>
      </Button>
    </div>
  );
}
