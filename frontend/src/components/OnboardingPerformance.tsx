import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";
import {
  onboardingOptionButtonClass,
  onboardingOptionLabelClass,
} from "@/components/onboarding/onboardingOptionStyles";
import {
  getPerformanceQuestionsForRole,
  getPerformanceStepCopyForRole,
} from "@/lib/enums/onboardingQuestions";
import { CUSTOMER_ROLE, type CustomerRoleSlug } from "@/lib/enums/customerProfile";
import {
  normalizeCustomerRoleTypes,
  resolvePrimaryCustomerRole,
} from "@/lib/enums/customerRoleTypes";

interface OnboardingPerformanceProps extends OnboardingStepChromeProps {
  roles?: readonly string[];
  defaultAnswers?: Record<string, number>;
  onNext: (scores: { pq1: number; pq2: number; pq3: number; pq4: number; pq5: number; performance_score: number }) => void;
  onSaveAndContinueLater: (patch: { performanceScores: Record<string, number> }) => void;
}

function resolvePerformanceRole(roles?: readonly string[]): CustomerRoleSlug {
  const normalized = normalizeCustomerRoleTypes(roles);
  if (normalized.length > 0) {
    return resolvePrimaryCustomerRole(normalized);
  }
  return CUSTOMER_ROLE.PRO;
}

const OnboardingPerformance = ({
  roles,
  defaultAnswers = {},
  onNext,
  onSaveAndContinueLater,
  savingLater,
}: OnboardingPerformanceProps) => {
  const resolvedRole = useMemo(() => resolvePerformanceRole(roles), [roles]);
  const questions = useMemo(() => getPerformanceQuestionsForRole(resolvedRole), [resolvedRole]);
  const stepCopy = useMemo(() => getPerformanceStepCopyForRole(resolvedRole), [resolvedRole]);
  const [answers, setAnswers] = useState<Record<string, number>>(defaultAnswers);

  const allAnswered = questions.every((q) => answers[q.field] !== undefined);

  const handleSelect = (field: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    if (!allAnswered) return;
    const { pq1, pq2, pq3, pq4, pq5 } = answers as Record<string, number>;
    const performance_score = Math.round(((pq1 + pq2 + pq3 + pq4 + pq5) / 5) * 10) / 10;
    onNext({ pq1, pq2, pq3, pq4, pq5, performance_score });
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        className={cn(bubbleStyle("Group_transparent_"), "max-w-2xl w-full text-center space-y-8")}
      >
        <div className="space-y-1">
          <p className={cn(bubbleStyle("Text_caption_"), "tracking-wide uppercase")}>
            PuP 360 Dimension 2 of 3 · Universal all roles
          </p>
        </div>

        <div className="space-y-3">
          <h1
            className={cn(bubbleStyle("Text_heading_1_"), "text-3xl md:text-4xl leading-tight tracking-tight")}
          >
            {stepCopy.heading}
          </h1>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-base md:text-lg leading-relaxed max-w-md mx-auto")}>
            {stepCopy.caption}
          </p>
        </div>

        <div className="space-y-6 text-left">
          {questions.map((q, qIndex) => (
            <div key={q.field} className="space-y-2">
              <p
                className={cn(bubbleStyle("Text_label_copy_"), "text-sm font-semibold text-foreground")}
              >
                {qIndex + 1}. {q.question}
              </p>
              <div
                className={cn(bubbleStyle("RepeatingGroup_list_"), "grid gap-1.5")}
              >
                {q.answers.map((answer) => {
                  const isSelected = answers[q.field] === answer.score;
                  return (
                    <button
                      key={answer.slug}
                      type="button"
                      onClick={() => handleSelect(q.field, answer.score)}
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
                        {answer.label}
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
          onSaveAndContinueLater={() => onSaveAndContinueLater({ performanceScores: answers })}
          savingLater={savingLater}
        />
      </div>
    </div>
  );
};

export default OnboardingPerformance;
