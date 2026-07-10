import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  HEALTH_FLAG_OPTIONS,
  buildHealthFlagsFromSelection,
  toggleHealthFlagSelection,
  type HealthFlagsPayload,
} from "@/lib/enums/onboardingQuestions";
import { ONBOARDING_STEP } from "@/lib/enums/onboardingSteps";
import { getStepDisplayNumber, ONBOARDING_SCORED_STEP_COUNT } from "@/lib/onboardingWizard";

interface OnboardingHealthFlagsProps {
  onNext: (data: HealthFlagsPayload) => void;
}

const options = HEALTH_FLAG_OPTIONS;
const stepNumber = getStepDisplayNumber(ONBOARDING_STEP.HEALTH_WELLNESS_FLAGS);

const OnboardingHealthFlags = ({ onNext }: OnboardingHealthFlagsProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleToggle = (slug: string) => {
    setSelected((prev) => toggleHealthFlagSelection(prev, slug));
  };

  const hasSelection = selected.size > 0;

  const handleContinue = () => {
    if (!hasSelection) return;
    onNext(buildHealthFlagsFromSelection(Array.from(selected)));
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        className={cn(bubbleStyle("Group_transparent_"), "max-w-2xl w-full text-center space-y-8")}
      >
        {stepNumber !== null && (
          <p className={cn(bubbleStyle("Text_caption_"), "tracking-wide uppercase")}>
            Step {stepNumber} of {ONBOARDING_SCORED_STEP_COUNT}
          </p>
        )}

        <div className="space-y-3">
          <h1
            className={cn(
              bubbleStyle("Text_heading_1_"),
              "text-3xl md:text-4xl leading-tight tracking-tight"
            )}
          >
            Is there anything in your health journey — or life situation — you&apos;d like your coach
            to be aware of?
          </h1>
          <p
            className={cn(
              bubbleStyle("Text_body_muted_"),
              "text-base md:text-lg leading-relaxed max-w-md mx-auto"
            )}
          >
            Completely optional and entirely private. Select any that apply.
          </p>
        </div>

        <div
          className={cn(bubbleStyle("RepeatingGroup_list_"), "grid gap-2 max-w-lg mx-auto text-left")}
        >
          {options.map((opt) => {
            const isSelected = selected.has(opt.slug);
            return (
              <button
                key={opt.slug}
                type="button"
                data-custom-state={opt.customStateKey}
                onClick={() => handleToggle(opt.slug)}
                className={cn(
                  bubbleStyle("Group_transparent_"),
                  "w-full text-left px-3.5 py-3 rounded-lg border transition-all text-sm flex items-start gap-3",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className={bubbleStyle("Text_inter_13__400__white_copy_copy_")}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <Button
            variant="cta"
            size="lg"
            onClick={handleContinue}
            disabled={!hasSelection}
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

export default OnboardingHealthFlags;
