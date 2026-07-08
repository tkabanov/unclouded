import { Lightbulb, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

const INSIGHT_ITEMS = [
  {
    bubbleId: "ai_RNbBHXSC",
    iconBubbleId: "ai_RNbBHXSD",
    textBubbleId: "ai_RNbBHXSE",
    icon: Lightbulb,
    text: "You tend to feel more focused on days you journal before noon.",
  },
  {
    bubbleId: "ai_RNbBHXSF",
    iconBubbleId: "ai_RNbBHXSG",
    textBubbleId: "ai_RNbBHXSH",
    icon: TrendingUp,
    text: "Your energy levels have improved over the past 5 check-ins.",
  },
  {
    bubbleId: "ai_RNbBHXSI",
    iconBubbleId: "ai_RNbBHXSJ",
    textBubbleId: "ai_RNbBHXSK",
    icon: Star,
    text: "Consistent check-ins this week — keep building that habit.",
  },
] as const;

export default function DashboardInsightsCard() {
  return (
    <div
      data-bubble-id="ai_RNbBHXRx"
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
    >
      <div
        data-bubble-id="ai_RNbBHXRy"
        className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
      >
        <TrendingUp
          data-bubble-id="ai_RNbBHXRz"
          className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")}
          aria-hidden
        />
        <h2
          data-bubble-id="ai_RNbBHXSA"
          data-style-ref="Text_heading_3_"
          className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}
        >
          Coaching Insights
        </h2>
      </div>

      <div
        data-bubble-id="ai_RNbBHXSB"
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
      >
        {INSIGHT_ITEMS.map((item) => (
          <div
            key={item.bubbleId}
            data-bubble-id={item.bubbleId}
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex items-start gap-3 rounded-lg bg-accent/30 p-3",
            )}
          >
            <item.icon
              data-bubble-id={item.iconBubbleId}
              className={cn(bubbleStyle("Icon_primary_"), "mt-0.5 h-4 w-4 shrink-0")}
              aria-hidden
            />
            <p
              data-bubble-id={item.textBubbleId}
              className={cn(bubbleStyle("Text_body_"), "text-sm text-foreground")}
            >
              {item.text}
            </p>
          </div>
        ))}
      </div>

      <p
        data-bubble-id="ai_RNbBHXSL"
        data-style-ref="Text_small_"
        className={cn(bubbleStyle("Text_small_"), "text-[11px] text-muted-foreground")}
      >
        Insights are coaching observations only, not clinical assessments.
      </p>
    </div>
  );
}
