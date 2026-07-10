import { Heart, MessageSquare, Phone, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import ChatSuggestionCard from "./ChatSuggestionCard";

export interface ChatWelcomePanelProps {
  className?: string;
}

export default function ChatWelcomePanel({ className }: ChatWelcomePanelProps) {
  return (
    <div
      className={cn(
        bubbleStyle("Group_panel_"),
        "flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-card p-6 md:p-10",
        className,
      )}
    >
      <div className="flex w-full max-w-md flex-col gap-4">
        <header className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2 pt-4")}>
          <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}>
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
              <Heart
                className={cn(bubbleStyle("Icon_primary_"), "h-3 w-3 text-primary-foreground")}
                aria-hidden
              />
            </div>
            <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-sm font-semibold text-foreground")}>
              Crisis Resources
            </h2>
          </div>
          <p className={cn(bubbleStyle("Text_caption_"), "text-xs text-muted-foreground")}>
            Always available, always free
          </p>
        </header>

        <section className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-3 pt-4")}>
          <ChatSuggestionCard
            icon={<Phone className="h-3.5 w-3.5" />}
            label="988 Lifeline"
            description="Suicide & Crisis Lifeline"
            action="Call or text 988"
            href="tel:988"
          />
          <ChatSuggestionCard
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="Crisis Text Line"
            description="Free, 24/7 text support"
            action="Text HOME to 741741"
            href="sms:741741?body=HOME"
          />
          <ChatSuggestionCard
            icon={<Stethoscope className="h-3.5 w-3.5" />}
            label="SAMHSA Helpline"
            description="Substance use & mental health"
            action="1-800-662-4357"
            href="tel:18006624357"
          />
          <p
            className={cn(
              bubbleStyle("Text_caption_"),
              "border-t border-border pt-3 text-xs leading-6 text-muted-foreground",
            )}
          >
            Unclouded is AI coaching only — not therapy or medical care. In an emergency, call 911.
          </p>
        </section>
      </div>
    </div>
  );
}
