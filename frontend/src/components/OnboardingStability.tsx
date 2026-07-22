import { useState } from "react";
import { STABILITY_QUESTIONS } from "@/lib/enums/onboardingQuestions";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";
import { onboardingOptionButtonClass } from "@/components/onboarding/onboardingOptionStyles";

interface OnboardingStabilityProps extends OnboardingStepChromeProps {
  defaultAnswers?: Record<string, number>;
  onNext: (scores: { sq1: number; sq2: number; sq3: number; sq4: number; sq5: number; stability_score: number }) => void;
  onSaveAndContinueLater: (patch: { stabilityScores: Record<string, number> }) => void;
}

const questions = STABILITY_QUESTIONS;

const OnboardingStability = ({
  defaultAnswers = {},
  onNext,
  onSaveAndContinueLater,
  savingLater,
}: OnboardingStabilityProps) => {
  const [answers, setAnswers] = useState<Record<string, number>>(defaultAnswers);

  const allAnswered = questions.every((q) => answers[q.field] !== undefined);

  const handleSelect = (field: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    if (!allAnswered) return;
    const sq1 = answers.sq1;
    const sq2 = answers.sq2;
    const sq3 = answers.sq3;
    const sq4 = answers.sq4;
    const sq5 = answers.sq5;
    const stability_score = Math.round(((sq1 + sq2 + sq3 + sq4 + sq5) / 5) * 10) / 10;
    onNext({ sq1, sq2, sq3, sq4, sq5, stability_score });
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            Step 4 of 12
          </p>
          <p className="text-xs text-muted-foreground">
            PuP 360 Dimension 1 of 3 · Universal all roles
          </p>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            How you're holding up emotionally
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            There are no right or wrong answers. Answer based on the past two to three weeks.
          </p>
        </div>

        <div className="space-y-6 text-left">
          {questions.map((q, qIndex) => (
            <div key={q.field} className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-1.5">
                {q.answers.map((answer) => {
                  const isSelected = answers[q.field] === answer.score;
                  return (
                    <button
                      key={answer.slug}
                      onClick={() => handleSelect(q.field, answer.score)}
                      className={onboardingOptionButtonClass(isSelected)}
                    >
                      {answer.label}
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
          onSaveAndContinueLater={() => onSaveAndContinueLater({ stabilityScores: answers })}
          savingLater={savingLater}
        />
      </div>
    </div>
  );
};

export default OnboardingStability;
