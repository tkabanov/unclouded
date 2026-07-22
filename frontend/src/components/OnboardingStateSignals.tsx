import { useState } from "react";
import { cn } from "@/lib/utils";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";
import { onboardingOptionButtonClass } from "@/components/onboarding/onboardingOptionStyles";

interface OnboardingStateSignalsProps extends OnboardingStepChromeProps {
  firstName: string;
  defaultAnswers?: Record<string, string>;
  onNext: (signals: { nervous_system_state: string; energy_level_signal: string }) => void;
  onSaveAndContinueLater: (patch: { stateSignals: Record<string, string> }) => void;
}

const questions = [
  {
    field: "nervous_system_state",
    question: "Which best describes how your nervous system feels most of the time right now?",
    options: [
      { value: "wired", label: "On edge, anxious, or tightly wound — like I'm braced for something" },
      { value: "regulated", label: "Mostly calm and stable — I feel grounded most days" },
      { value: "depleted", label: "Exhausted and flat — I have no reserves left" },
      { value: "shut_down", label: "Numb or disconnected — I'm going through the motions" },
    ],
  },
  {
    field: "energy_level_signal",
    question: "How would you describe your energy levels over the past two to three weeks?",
    options: [
      { value: "strong", label: "Strong — I have real energy available most days" },
      { value: "moderate", label: "Moderate — enough to function but not much surplus" },
      { value: "low", label: "Low — I'm running on fumes more days than not" },
      { value: "depleted", label: "Depleted — I'm exhausted even when I sleep" },
    ],
  },
];

const OnboardingStateSignals = ({
  firstName,
  defaultAnswers = {},
  onNext,
  onSaveAndContinueLater,
  savingLater,
}: OnboardingStateSignalsProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>(defaultAnswers);

  const allAnswered = questions.every((q) => answers[q.field] !== undefined);

  const handleContinue = () => {
    if (!allAnswered) return;
    onNext({
      nervous_system_state: answers.nervous_system_state,
      energy_level_signal: answers.energy_level_signal,
    });
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          Step 9 of 12
        </p>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            How is your body holding everything right now, {firstName}?
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            This isn't about fitness. It's about how your system is responding to what you're carrying.
          </p>
        </div>

        <div className="space-y-6 text-left">
          {questions.map((q, qIndex) => (
            <div key={q.field} className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-1.5">
                {q.options.map((opt) => {
                  const isSelected = answers[q.field] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.field]: opt.value }))}
                      className={onboardingOptionButtonClass(isSelected)}
                    >
                      {opt.label}
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
          onSaveAndContinueLater={() => onSaveAndContinueLater({ stateSignals: answers })}
          savingLater={savingLater}
        />
      </div>
    </div>
  );
};

export default OnboardingStateSignals;
