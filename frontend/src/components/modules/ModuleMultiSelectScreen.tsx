import { cn } from "@/lib/utils";
import type { ModuleQuestion } from "@/lib/modules/moduleConfigTypes";

interface ModuleMultiSelectScreenProps {
  question: ModuleQuestion;
  questionNumber: number;
  totalQuestions: number;
  value: unknown;
  onToggle: (slug: string) => void;
  onContinue: () => void;
  canContinue: boolean;
}

export default function ModuleMultiSelectScreen({
  question,
  questionNumber,
  totalQuestions,
  value,
  onToggle,
  onContinue,
  canContinue,
}: ModuleMultiSelectScreenProps) {
  const selected = Array.isArray(value) ? value : [];

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
          <p className="text-sm text-muted-foreground">Select all that apply.</p>
        </div>

        <div className="grid gap-2">
          {question.options.map((option) => {
            const isSelected = selected.includes(option.slug);
            return (
              <button
                key={option.slug}
                type="button"
                onClick={() => onToggle(option.slug)}
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
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className={cn(
              "inline-flex min-w-[200px] items-center justify-center rounded-md px-6 py-3 text-sm font-semibold transition-colors",
              canContinue
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
