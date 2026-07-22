import { useState } from "react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { LOAD_SIGNAL_QUESTIONS } from "@/lib/enums/onboardingQuestions";
import { ONBOARDING_STEP } from "@/lib/enums/onboardingSteps";
import { getStepDisplayNumber, ONBOARDING_SCORED_STEP_COUNT } from "@/lib/onboardingWizard";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";
import {
  onboardingOptionButtonClass,
  onboardingOptionLabelClass,
} from "@/components/onboarding/onboardingOptionStyles";

interface OnboardingLoadSignalsProps extends OnboardingStepChromeProps {
  firstName: string;
  defaultAnswers?: Record<string, string>;
  onNext: (signals: {
    cognitive_load_signal: string;
    relational_load_signal: string;
    environmental_load_signal: string;
    financial_load_signal: string;
  }) => void;
  onSaveAndContinueLater: (patch: { loadSignals: Record<string, string> }) => void;
}

const questions = LOAD_SIGNAL_QUESTIONS;
const stepNumber = getStepDisplayNumber(ONBOARDING_STEP.LOAD_SIGNALS);

const LOAD_SIGNAL_CUSTOM_STATE_KEYS: Record<string, string> = {
  cognitive_load_signal: "load_signal_cognitive",
  relational_load_signal: "load_signal_relational",
  environmental_load_signal: "load_signal_environmental",
  financial_load_signal: "load_signal_financial",
};

const OnboardingLoadSignals = ({
  firstName,
  defaultAnswers = {},
  onNext,
  onSaveAndContinueLater,
  savingLater,
}: OnboardingLoadSignalsProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>(defaultAnswers);

  const allAnswered = questions.every((q) => answers[q.field] !== undefined);

  const handleSelect = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    if (!allAnswered) return;
    onNext({
      cognitive_load_signal: answers.cognitive_load_signal,
      relational_load_signal: answers.relational_load_signal,
      environmental_load_signal: answers.environmental_load_signal,
      financial_load_signal: answers.financial_load_signal,
    });
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
            Let&apos;s understand what&apos;s pressing on you right now, {firstName}.
          </h1>
          <p
            className={cn(
              bubbleStyle("Text_body_muted_"),
              "text-base md:text-lg leading-relaxed max-w-md mx-auto"
            )}
          >
            These help your coach understand your context. Be honest, not optimistic.
          </p>
        </div>

        <div className="space-y-6 text-left">
          {questions.map((q, qIndex) => (
            <div
              key={q.field}
              data-custom-state={LOAD_SIGNAL_CUSTOM_STATE_KEYS[q.field]}
              className="space-y-2"
            >
              <p
                className={cn(bubbleStyle("Text_label_copy_"), "text-sm font-semibold text-foreground")}
              >
                {qIndex + 1}. {q.question}
              </p>
              <div
                className={cn(bubbleStyle("RepeatingGroup_list_"), "grid gap-1.5")}
              >
                {q.answers.map((opt) => {
                  const isSelected = answers[q.field] === opt.slug;
                  return (
                    <button
                      key={opt.slug}
                      type="button"
                      onClick={() => handleSelect(q.field, opt.slug)}
                      className={cn(
                        bubbleStyle("Group_transparent_"),
                        onboardingOptionButtonClass(isSelected),
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
          ))}
        </div>

        <OnboardingStepActions
          onContinue={handleContinue}
          continueDisabled={!allAnswered}
          onSaveAndContinueLater={() => onSaveAndContinueLater({ loadSignals: answers })}
          savingLater={savingLater}
        />
      </div>
    </div>
  );
};

export default OnboardingLoadSignals;
