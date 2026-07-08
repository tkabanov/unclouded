import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { ORIENTATION_ANSWERS } from "@/lib/enums/onboardingQuestions";

interface OnboardingOrientationProps {
  onNext: (orientation_score: number) => void;
}

const OnboardingOrientation = ({ onNext }: OnboardingOrientationProps) => {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        data-bubble-id="bTHJm"
        className={cn(bubbleStyle("Group_transparent_"), "max-w-xl w-full text-center space-y-8")}
      >
        <div className="space-y-3">
          <h1 className={cn(bubbleStyle("Text_heading_1_"), "text-3xl md:text-4xl leading-tight tracking-tight")}>
            When you think about where you are right now, which feels most true?
          </h1>
        </div>

        <div data-bubble-id="bTHli" className="space-y-2">
          <div
            data-bubble-id="bTHVW"
            className={cn(bubbleStyle("RepeatingGroup_list_"), "grid gap-2 max-w-md mx-auto text-left")}
          >
            {ORIENTATION_ANSWERS.map((opt) => {
              const isSelected = selected === opt.score;
              return (
                <button
                  key={opt.bubbleId}
                  type="button"
                  data-bubble-id="bTHVi"
                  data-option-bubble-id={opt.bubbleId}
                  onClick={() => setSelected(opt.score)}
                  className={cn(
                    bubbleStyle("Group_transparent_"),
                    "w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <span data-bubble-id="bTHVm" className={bubbleStyle("Text_inter_13__400__white_copy_copy_")}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div data-bubble-id="bTGOk" className="pt-2">
          <Button
            data-bubble-id="bTGOp"
            variant="cta"
            size="lg"
            onClick={() => selected !== null && onNext(selected)}
            disabled={selected === null}
            className={cn(bubbleStyle("Button_primary_"), "group")}
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOrientation;
