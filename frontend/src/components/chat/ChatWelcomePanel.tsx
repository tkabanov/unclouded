import { Heart, MessageSquare, Phone, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHAT_SUGGESTION_988_ACTION_BUBBLE_ID,
  CHAT_SUGGESTION_988_CARD_BUBBLE_ID,
  CHAT_SUGGESTION_988_DESC_BUBBLE_ID,
  CHAT_SUGGESTION_988_HEADER_BUBBLE_ID,
  CHAT_SUGGESTION_988_ICON_BUBBLE_ID,
  CHAT_SUGGESTION_988_LABEL_BUBBLE_ID,
  CHAT_SUGGESTION_SAMHSA_ACTION_BUBBLE_ID,
  CHAT_SUGGESTION_SAMHSA_CARD_BUBBLE_ID,
  CHAT_SUGGESTION_SAMHSA_DESC_BUBBLE_ID,
  CHAT_SUGGESTION_SAMHSA_HEADER_BUBBLE_ID,
  CHAT_SUGGESTION_SAMHSA_ICON_BUBBLE_ID,
  CHAT_SUGGESTION_SAMHSA_LABEL_BUBBLE_ID,
  CHAT_SUGGESTION_TEXTLINE_ACTION_BUBBLE_ID,
  CHAT_SUGGESTION_TEXTLINE_CARD_BUBBLE_ID,
  CHAT_SUGGESTION_TEXTLINE_DESC_BUBBLE_ID,
  CHAT_SUGGESTION_TEXTLINE_HEADER_BUBBLE_ID,
  CHAT_SUGGESTION_TEXTLINE_ICON_BUBBLE_ID,
  CHAT_SUGGESTION_TEXTLINE_LABEL_BUBBLE_ID,
  CHAT_WELCOME_HEADER_BUBBLE_ID,
  CHAT_WELCOME_ICON_BUBBLE_ID,
  CHAT_WELCOME_ICON_GROUP_BUBBLE_ID,
  CHAT_WELCOME_PANEL_BUBBLE_ID,
  CHAT_WELCOME_DISCLAIMER_BUBBLE_ID,
  CHAT_WELCOME_SUBTITLE_BUBBLE_ID,
  CHAT_WELCOME_SUGGESTIONS_BUBBLE_ID,
  CHAT_WELCOME_TITLE_BUBBLE_ID,
  CHAT_WELCOME_TITLE_ROW_BUBBLE_ID,
} from "@/lib/chat/routes";
import { bubbleStyle } from "@/styles";
import ChatSuggestionCard from "./ChatSuggestionCard";

export interface ChatWelcomePanelProps {
  className?: string;
}

/**
 * Right-column empty state (ai_RNbBHXdz / ai_RNbBHXcE): crisis resources header and hotline cards.
 * Mutually exclusive with ChatReusable mount when ?conversation= is absent.
 */
export default function ChatWelcomePanel({ className }: ChatWelcomePanelProps) {
  return (
    <div
      data-bubble-id={CHAT_WELCOME_PANEL_BUBBLE_ID}
      className={cn(
        bubbleStyle("Group_panel_"),
        "flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-[var(--color_surface_default)] p-6 md:p-10",
        className,
      )}
    >
      <div className="flex w-full max-w-md flex-col gap-4">
        <header
          data-bubble-id={CHAT_WELCOME_HEADER_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2 pt-4")}
        >
          <div
            data-bubble-id={CHAT_WELCOME_TITLE_ROW_BUBBLE_ID}
            className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
          >
            <div
              data-bubble-id={CHAT_WELCOME_ICON_GROUP_BUBBLE_ID}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color_primary_default)]"
            >
              <Heart
                data-bubble-id={CHAT_WELCOME_ICON_BUBBLE_ID}
                className={cn(bubbleStyle("Icon_primary_"), "h-3 w-3 text-[var(--color_primary_contrast_default)]")}
                aria-hidden
              />
            </div>
            <h2
              data-bubble-id={CHAT_WELCOME_TITLE_BUBBLE_ID}
              className={cn(bubbleStyle("Text_heading_3_"), "text-sm font-semibold text-foreground")}
            >
              Crisis Resources
            </h2>
          </div>
          <p
            data-bubble-id={CHAT_WELCOME_SUBTITLE_BUBBLE_ID}
            className={cn(bubbleStyle("Text_caption_"), "text-xs text-[var(--color_aiRNbAaxgs_default)]")}
          >
            Always available, always free
          </p>
        </header>

        <section
          data-bubble-id={CHAT_WELCOME_SUGGESTIONS_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-3 pt-4")}
        >
          <ChatSuggestionCard
            cardBubbleId={CHAT_SUGGESTION_988_CARD_BUBBLE_ID}
            headerBubbleId={CHAT_SUGGESTION_988_HEADER_BUBBLE_ID}
            iconBubbleId={CHAT_SUGGESTION_988_ICON_BUBBLE_ID}
            labelBubbleId={CHAT_SUGGESTION_988_LABEL_BUBBLE_ID}
            descBubbleId={CHAT_SUGGESTION_988_DESC_BUBBLE_ID}
            actionBubbleId={CHAT_SUGGESTION_988_ACTION_BUBBLE_ID}
            icon={<Phone className="h-3.5 w-3.5" />}
            label="988 Lifeline"
            description="Suicide & Crisis Lifeline"
            action="Call or text 988"
            href="tel:988"
          />
          <ChatSuggestionCard
            cardBubbleId={CHAT_SUGGESTION_TEXTLINE_CARD_BUBBLE_ID}
            headerBubbleId={CHAT_SUGGESTION_TEXTLINE_HEADER_BUBBLE_ID}
            iconBubbleId={CHAT_SUGGESTION_TEXTLINE_ICON_BUBBLE_ID}
            labelBubbleId={CHAT_SUGGESTION_TEXTLINE_LABEL_BUBBLE_ID}
            descBubbleId={CHAT_SUGGESTION_TEXTLINE_DESC_BUBBLE_ID}
            actionBubbleId={CHAT_SUGGESTION_TEXTLINE_ACTION_BUBBLE_ID}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="Crisis Text Line"
            description="Free, 24/7 text support"
            action="Text HOME to 741741"
            href="sms:741741?body=HOME"
          />
          <ChatSuggestionCard
            cardBubbleId={CHAT_SUGGESTION_SAMHSA_CARD_BUBBLE_ID}
            headerBubbleId={CHAT_SUGGESTION_SAMHSA_HEADER_BUBBLE_ID}
            iconBubbleId={CHAT_SUGGESTION_SAMHSA_ICON_BUBBLE_ID}
            labelBubbleId={CHAT_SUGGESTION_SAMHSA_LABEL_BUBBLE_ID}
            descBubbleId={CHAT_SUGGESTION_SAMHSA_DESC_BUBBLE_ID}
            actionBubbleId={CHAT_SUGGESTION_SAMHSA_ACTION_BUBBLE_ID}
            icon={<Stethoscope className="h-3.5 w-3.5" />}
            label="SAMHSA Helpline"
            description="Substance use & mental health"
            action="1-800-662-4357"
            href="tel:18006624357"
          />
          <p
            data-bubble-id={CHAT_WELCOME_DISCLAIMER_BUBBLE_ID}
            className={cn(
              bubbleStyle("Text_caption_"),
              "border-t border-[var(--color_aiRNbAaxgw_default)] pt-3 text-xs leading-6 text-[var(--color_aiRNbAaxgs_default)]",
            )}
          >
            Unclouded is AI coaching only — not therapy or medical care. In an emergency, call 911.
          </p>
        </section>
      </div>
    </div>
  );
}
