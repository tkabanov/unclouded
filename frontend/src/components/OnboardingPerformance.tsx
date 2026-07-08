import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  getPerformanceQuestionsForRole,
  getPerformanceStepCopyForRole,
} from "@/lib/enums/onboardingQuestions";
import { CUSTOMER_ROLE, type CustomerRoleSlug } from "@/lib/enums/customerProfile";

interface OnboardingPerformanceProps {
  role?: string;
  onNext: (scores: { pq1: number; pq2: number; pq3: number; pq4: number; pq5: number; performance_score: number }) => void;
}

function resolvePerformanceRole(role?: string): CustomerRoleSlug {
  const roles = Object.values(CUSTOMER_ROLE) as CustomerRoleSlug[];
  if (role && roles.includes(role as CustomerRoleSlug)) {
    return role as CustomerRoleSlug;
  }
  return CUSTOMER_ROLE.PRO;
}

const OnboardingPerformance = ({ role, onNext }: OnboardingPerformanceProps) => {
  const resolvedRole = useMemo(() => resolvePerformanceRole(role), [role]);
  const questions = useMemo(() => getPerformanceQuestionsForRole(resolvedRole), [resolvedRole]);
  const stepCopy = useMemo(() => getPerformanceStepCopyForRole(resolvedRole), [resolvedRole]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

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
        data-bubble-id="bTHJm"
        className={cn(bubbleStyle("Group_transparent_"), "max-w-2xl w-full text-center space-y-8")}
      >
        <div className="space-y-1">
          <p className={cn(bubbleStyle("Text_caption_"), "tracking-wide uppercase")}>
            PuP 360 Dimension 2 of 3 · Universal all roles
          </p>
        </div>

        <div className="space-y-3">
          <h1
            data-bubble-id={stepCopy.headingBubbleId}
            className={cn(bubbleStyle("Text_heading_1_"), "text-3xl md:text-4xl leading-tight tracking-tight")}
          >
            {stepCopy.heading}
          </h1>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-base md:text-lg leading-relaxed max-w-md mx-auto")}>
            {stepCopy.caption}
          </p>
        </div>

        <div data-bubble-id="bTHOZ" className="space-y-6 text-left">
          {questions.map((q, qIndex) => (
            <div key={q.field} data-bubble-id="bTGNh" data-question-bubble-id={q.bubbleId} className="space-y-2">
              <p
                data-bubble-id="bTGNn"
                className={cn(bubbleStyle("Text_label_copy_"), "text-sm font-semibold text-foreground")}
              >
                {qIndex + 1}. {q.question}
              </p>
              <div
                data-bubble-id="bTHVW"
                className={cn(bubbleStyle("RepeatingGroup_list_"), "grid gap-1.5")}
              >
                {q.answers.map((answer) => {
                  const isSelected = answers[q.field] === answer.score;
                  return (
                    <button
                      key={answer.bubbleId}
                      type="button"
                      data-bubble-id="bTHVi"
                      data-option-bubble-id={answer.bubbleId}
                      onClick={() => handleSelect(q.field, answer.score)}
                      className={cn(
                        bubbleStyle("Group_transparent_"),
                        "w-full text-left px-3.5 py-2.5 rounded-lg border transition-all text-sm",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground font-medium"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                      )}
                    >
                      <span data-bubble-id="bTHVm" className={bubbleStyle("Text_inter_13__400__white_copy_copy_")}>
                        {answer.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div data-bubble-id="bTGOk" className="pt-2">
          <Button
            data-bubble-id="bTGOp"
            variant="cta"
            size="lg"
            onClick={handleContinue}
            disabled={!allAnswered}
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

export default OnboardingPerformance;
