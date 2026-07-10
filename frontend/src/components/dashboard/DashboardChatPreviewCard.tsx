import { useCallback, useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { fetchChatPreview } from "@/lib/dashboard/chatPreviewApi";
import { Skeleton } from "@/components/ui/skeleton";

const CHAT_PROMPT_CHIPS = [
  { label: "Plan my day", href: "/chat" },
  { label: "Reflect on this week", href: "/chat" },
  { label: "Set a new goal", href: "/chat" },
] as const;

export default function DashboardChatPreviewCard() {
  const { user } = useAuth();
  const { profile } = useDashboardUserContext();
  const [loading, setLoading] = useState(true);
  const [conversationTitle, setConversationTitle] = useState("Your AI Coach");
  const [lastMessageText, setLastMessageText] = useState("");

  const loadPreview = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const preview = await fetchChatPreview(user.id, profile?.onboardingData ?? null);
      setConversationTitle(preview.conversationTitle);
      setLastMessageText(preview.lastMessageText);
    } catch (err) {
      console.error("Failed to load chat preview", err);
      setConversationTitle("Your AI Coach");
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
      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex items-start justify-between gap-3")}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 items-center gap-2")}
        >
          <span className={cn(bubbleStyle("Icon_primary_"), "shrink-0")} aria-hidden>
            <Bot className="h-5 w-5" />
          </span>
          <p
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold leading-tight")}
          >
            AI Coach Chat
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

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2")}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex items-start gap-3")}
        >
          <div
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10",
            )}
          >
            <span className={cn(bubbleStyle("Icon_primary_"))} aria-hidden>
              <Bot className="h-4 w-4" />
            </span>
          </div>

          {loading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <p
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "min-w-0 text-sm font-medium")}
            >
              {conversationTitle}
            </p>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-4 w-full" />
        ) : (
          <p
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm italic text-muted-foreground line-clamp-2")}
          >
            {lastMessageText}
          </p>
        )}
      </div>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2")}
      >
        <p
          data-style-ref="Text_small_"
          className={cn(
            bubbleStyle("Text_small_"),
            "text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
          )}
        >
          Quick start
        </p>

        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap gap-1.5")}
        >
          {CHAT_PROMPT_CHIPS.map((chip) => (
            <Link
              key={chip.label}
              to={chip.href}
              data-style-ref="Group_chip_"
              className={cn(
                bubbleStyle("Group_chip_"),
                "inline-flex text-xs text-foreground no-underline transition-colors",
              )}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
