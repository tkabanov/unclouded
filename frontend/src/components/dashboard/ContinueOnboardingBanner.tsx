import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

/** G - continue onboarding (bTIpm) — resume CTA when profile onboarding is incomplete. */
export default function ContinueOnboardingBanner() {
  const navigate = useNavigate();

  return (
    <div
      data-bubble-id="bTIpm"
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col items-center gap-2.5 border-primary/30 bg-primary/5 p-6 text-center md:p-8",
      )}
    >
      <div
        data-bubble-id="bTIps"
        className="inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-[rgba(44,127,140,0.1)] p-2.5"
      >
        <Sparkles className="h-[30px] w-[30px] text-[var(--color_primary_default)]" aria-hidden />
      </div>

      <h2
        data-bubble-id="bTIpy"
        className={cn(bubbleStyle("Text_heading_2_"), "text-lg font-semibold text-foreground md:text-xl")}
      >
        Your dashboard is waiting
      </h2>

      <p
        data-bubble-id="bTIqE"
        className={cn(bubbleStyle("Text_body_muted_"), "max-w-xl text-sm leading-relaxed text-muted-foreground")}
      >
        Complete the quick onboarding so Uncloud360 can personalize your coaching, insights, and paths to
        fit how you actually operate under pressure.
      </p>

      <Button
        data-bubble-id="bTIqK"
        onClick={() => navigate("/onboarding")}
        variant="cta"
        size="lg"
        className={cn(bubbleStyle("Button_primary_"), "mt-1 shrink-0 gap-2")}
      >
        Continue onboarding
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
