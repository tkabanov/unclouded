import { ArrowRight, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

interface ReassessmentDueBannerProps {
  /** Premium on-demand entry when not auto-due. */
  variant?: "due" | "on_demand" | "on_demand_locked";
  /** Days until Premium on-demand unlocks (locked variant). */
  daysUntilOnDemand?: number;
}

/** US-300 — dashboard eligibility CTA for 90-day reassessment. */
export default function ReassessmentDueBanner({
  variant = "due",
  daysUntilOnDemand = 0,
}: ReassessmentDueBannerProps) {
  const navigate = useNavigate();
  const due = variant === "due";
  const onDemand = variant === "on_demand";
  const locked = variant === "on_demand_locked";

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col items-stretch gap-4 border-primary/30 bg-primary/5 p-6 md:flex-row md:items-center md:p-8",
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <CalendarDays className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2
            className={cn(
              bubbleStyle("Text_heading_2_"),
              "text-lg font-semibold text-foreground md:text-xl",
            )}
          >
            {due
              ? "Your 90-day reassessment is ready"
              : locked
                ? "Premium on-demand reassessment"
                : "Reassess your PuP 360 anytime"}
          </h2>
          <p
            className={cn(
              bubbleStyle("Text_body_muted_"),
              "max-w-xl text-sm leading-relaxed text-muted-foreground",
            )}
          >
            {due
              ? "Retake the assessment to see how your scores have changed — and get a fresh trajectory for the next season."
              : locked
                ? `Unlocks in ${daysUntilOnDemand} day${daysUntilOnDemand === 1 ? "" : "s"} — Premium members can reassess on demand 30 days after their last assessment.`
                : "As a Premium member you can reassess on demand after day 30. Track progress when it matters."}
          </p>
        </div>
      </div>
      {onDemand || due ? (
        <Button
          onClick={() => navigate("/onboarding?reassessment=1")}
          variant="cta"
          size="lg"
          className={cn(bubbleStyle("Button_primary_"), "shrink-0 gap-2")}
        >
          {due ? "Start reassessment" : "Reassess now"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      ) : (
        <Button variant="outline" size="lg" disabled className="shrink-0">
          Available in {daysUntilOnDemand} day{daysUntilOnDemand === 1 ? "" : "s"}
        </Button>
      )}
    </div>
  );
}
