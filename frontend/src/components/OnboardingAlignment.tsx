import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ALIGNMENT_QUESTIONS } from "@/lib/enums/onboardingQuestions";

interface OnboardingAlignmentProps {
  onNext: (scores: { aq1: number; aq2: number; aq3: number; aq4: number; aq5: number; alignment_score: number }) => void;
}

const questions = ALIGNMENT_QUESTIONS;

const OnboardingAlignment = ({ onNext }: OnboardingAlignmentProps) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const allAnswered = questions.every((q) => answers[q.field] !== undefined);

  const handleSelect = (field: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    if (!allAnswered) return;
    const { aq1, aq2, aq3, aq4, aq5 } = answers as Record<string, number>;
    const alignment_score = Math.round(((aq1 + aq2 + aq3 + aq4 + aq5) / 5) * 10) / 10;
    onNext({ aq1, aq2, aq3, aq4, aq5, alignment_score });
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            Step 6 of 12
          </p>
          <p className="text-xs text-muted-foreground">
            PuP 360 Dimension 3 of 3 · Universal all roles
          </p>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            How aligned your life feels
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            This looks at how your daily life matches who you are and where you want to go.
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
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 rounded-lg border transition-all text-sm",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground font-medium"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                      )}
                    >
                      {answer.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button
            variant="cta"
            size="lg"
            onClick={handleContinue}
            disabled={!allAnswered}
            className="group"
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingAlignment;
