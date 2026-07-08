import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reflectionQuestions, type ReflectionAnswers } from "@/lib/reassessment";

interface ReassessmentReflectionsProps {
  firstName: string;
  onNext: (answers: ReflectionAnswers) => void;
}

const ReassessmentReflections = ({ firstName, onNext }: ReassessmentReflectionsProps) => {
  const [answers, setAnswers] = useState<ReflectionAnswers>({});

  const handleChange = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const answeredCount = reflectionQuestions.filter(
    (q) => (answers[q.field] ?? "").trim().length > 0
  ).length;

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-12 overflow-y-auto">
      <div className="max-w-2xl w-full space-y-8">
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            Progress reflection
          </p>
          <p className="text-xs text-muted-foreground">Optional · Not scored</p>
        </div>

        <div className="space-y-3 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            A few reflections, {firstName || "there"}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg mx-auto">
            These aren't scored. They give your coach richer context and are added to your
            progress report. Answer as many or as few as you like.
          </p>
        </div>

        <div className="space-y-6 text-left">
          {reflectionQuestions.map((q, i) => (
            <div key={q.field} className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                {i + 1}. {q.question}
              </label>
              <textarea
                value={answers[q.field] ?? ""}
                onChange={(e) => handleChange(q.field, e.target.value)}
                rows={3}
                placeholder={q.placeholder}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 pt-2">
          <Button variant="cta" size="lg" onClick={() => onNext(answers)} className="group">
            See my progress
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-xs text-muted-foreground">
            {answeredCount === 0
              ? "You can skip these and continue."
              : `${answeredCount} of ${reflectionQuestions.length} answered`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReassessmentReflections;
