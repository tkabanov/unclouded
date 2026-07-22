import { useState } from "react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { ORIENTATION_ANSWERS } from "@/lib/enums/onboardingQuestions";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";
import {
  onboardingOptionButtonClass,
  onboardingOptionLabelClass,
} from "@/components/onboarding/onboardingOptionStyles";

interface OnboardingOrientationProps extends OnboardingStepChromeProps {
  defaultSelected?: number | null;
  onNext: (orientation_score: number) => void;
  onSaveAndContinueLater: (patch: { orientationScore: number }) => void;
}

const OnboardingOrientation = ({
  defaultSelected = null,
  onNext,
  onSaveAndContinueLater,
  savingLater,
}: OnboardingOrientationProps) => {
  const [selected, setSelected] = useState<number | null>(defaultSelected);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        className={cn(bubbleStyle("Group_transparent_"), "max-w-xl w-full text-center space-y-8")}
      >
        <div className="space-y-3">
          <h1 className={cn(bubbleStyle("Text_heading_1_"), "text-3xl md:text-4xl leading-tight tracking-tight")}>
            When you think about where you are right now, which feels most true?
          </h1>
        </div>

        <div className="space-y-2">
          <div
            className={cn(bubbleStyle("RepeatingGroup_list_"), "grid gap-2 max-w-md mx-auto text-left")}
          >
            {ORIENTATION_ANSWERS.map((opt) => {
              const isSelected = selected === opt.score;
              return (
                <button
                  key={opt.slug}
                  type="button"
                  onClick={() => setSelected(opt.score)}
                  className={cn(
                    bubbleStyle("Group_transparent_"),
                    onboardingOptionButtonClass(isSelected, "px-4 py-3 border-2"),
                  )}
                >
                  <span
                    className={onboardingOptionLabelClass(
                      isSelected,
                      bubbleStyle("Text_inter_13__400__white_copy_copy_"),
                    )}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <OnboardingStepActions
          onContinue={() => selected !== null && onNext(selected)}
          continueDisabled={selected === null}
          onSaveAndContinueLater={() =>
            onSaveAndContinueLater({ orientationScore: selected ?? 0 })
          }
          savingLater={savingLater}
        />
      </div>
    </div>
  );
};

export default OnboardingOrientation;
