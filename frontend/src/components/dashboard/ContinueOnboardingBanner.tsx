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
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col items-center gap-2.5 border-primary/30 bg-primary/5 p-6 text-center md:p-8",
      )}
    >
      <div
        className="inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-primary/10 p-2.5"
      >
        <Sparkles className="h-[30px] w-[30px] text-primary" aria-hidden />
      </div>

      <h2
        className={cn(bubbleStyle("Text_heading_2_"), "text-lg font-semibold text-foreground md:text-xl")}
      >
        Your dashboard is waiting
      </h2>

      <p
        className={cn(bubbleStyle("Text_body_muted_"), "max-w-xl text-sm leading-relaxed text-muted-foreground")}
      >
        Complete the quick onboarding so Uncloud360 can personalize your coaching, insights, and paths to
        fit how you actually operate under pressure.
      </p>

      <Button
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
