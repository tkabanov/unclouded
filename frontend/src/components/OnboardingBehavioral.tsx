import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingBehavioralProps {
  firstName: string;
  onNext: (data: { pressure_response_pattern: string; non_followthrough_reason: string }) => void;
}

const questions = [
  {
    field: "pressure_response_pattern",
    question: "When something feels hard or overwhelming, you tend to:",
    options: [
      { value: "avoid", label: "Put it off — deal with it later or hope it resolves" },
      { value: "overthink", label: "Think about it extensively before acting — sometimes too long" },
      { value: "push_through", label: "Move immediately — push through regardless of how I feel" },
      { value: "seek_help", label: "Reach out — I look for input or support before deciding" },
      { value: "variable", label: "It depends entirely on the situation — I don't have a consistent pattern" },
    ],
  },
  {
    field: "non_followthrough_reason",
    question: "When you don't follow through on something you intended to do, it's usually because:",
    options: [
      { value: "motivation", label: "I lose motivation once it gets hard or progress feels slow" },
      { value: "overwhelm", label: "I get overwhelmed and shut down — too much, too hard" },
      { value: "distraction", label: "Other things pull my attention and reprioritize my day" },
      { value: "wrong_goal", label: "I'm not sure it was the right goal or priority to begin with" },
      { value: "waiting", label: "I'm waiting for the right moment, more information, or better conditions" },
    ],
  },
];

const OnboardingBehavioral = ({ firstName, onNext }: OnboardingBehavioralProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = questions.every((q) => answers[q.field] !== undefined);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          Step 10 of 12
        </p>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            Last two questions, {firstName} — these are about how you actually respond.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            There is no right answer. The most useful answer is the most honest one.
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
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 rounded-lg border transition-all text-sm",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground font-medium"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                      )}
                    >
                      {opt.label}
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
            onClick={() => allAnswered && onNext({
              pressure_response_pattern: answers.pressure_response_pattern,
              non_followthrough_reason: answers.non_followthrough_reason,
            })}
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

export default OnboardingBehavioral;
