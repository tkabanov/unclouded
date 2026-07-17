import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ModuleQuestion } from "@/lib/modules/moduleConfigTypes";

interface ModuleQuestionScreenProps {
  question: ModuleQuestion;
  questionNumber: number;
  totalQuestions: number;
  value: unknown;
  onSelect: (slug: string) => void;
  onContinue: () => void;
  canContinue: boolean;
}

export default function ModuleQuestionScreen({
  question,
  questionNumber,
  totalQuestions,
  value,
  onSelect,
  onContinue,
  canContinue,
}: ModuleQuestionScreenProps) {
  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-8 pb-12">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
          </p>
          <h2 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">
            {question.prompt}
          </h2>
        </div>

        <div className="grid gap-2">
          {question.options.map((option) => {
            const isSelected = value === option.slug;
            return (
              <button
                key={option.slug}
                type="button"
                onClick={() => onSelect(option.slug)}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 font-medium text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center pt-2">
          <Button variant="cta" size="lg" disabled={!canContinue} onClick={onContinue} className="group">
            Continue
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
