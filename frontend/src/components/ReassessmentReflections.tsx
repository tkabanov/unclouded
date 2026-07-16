import { useCallback, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  reflectionQuestions,
  type ReflectionAnswers,
  type ReflectionQuestion,
} from "@/lib/reassessment";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

interface ReassessmentReflectionsProps {
  firstName: string;
  onNext: (answers: ReflectionAnswers) => void;
  questions?: ReflectionQuestion[];
}

const ReassessmentReflections = ({
  firstName,
  onNext,
  questions = reflectionQuestions,
}: ReassessmentReflectionsProps) => {
  const fieldRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [, bumpRevision] = useState(0);

  const collectAnswers = useCallback((): ReflectionAnswers => {
    const out: ReflectionAnswers = {};
    for (const q of questions) {
      out[q.field] = fieldRefs.current[q.field]?.value ?? "";
    }
    return out;
  }, [questions]);

  const answeredCount = questions.filter(
    (q) => (fieldRefs.current[q.field]?.value ?? "").trim().length > 0,
  ).length;

  const handleSubmit = () => {
    onNext(collectAnswers());
  };

  return (
    <section className="w-full px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Progress reflection
          </p>
          <p className="text-xs text-muted-foreground">Optional · Not scored</p>
        </div>

        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            A few reflections, {firstName || "there"}
          </h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            These aren&apos;t scored. They give your coach richer context and are added to your
            progress report. Answer as many or as few as you like.
          </p>
        </div>

        <div className="space-y-6 text-left">
          {questions.map((q, i) => {
            const inputId = `reassessment-reflection-${q.field}`;
            return (
              <div key={q.field} className="space-y-2">
                <label
                  htmlFor={inputId}
                  className={cn(bubbleStyle("Text_label_"), "block text-sm font-semibold text-foreground")}
                >
                  {i + 1}. {q.question}
                </label>
                <textarea
                  id={inputId}
                  ref={(el) => {
                    fieldRefs.current[q.field] = el;
                  }}
                  rows={3}
                  placeholder={q.placeholder}
                  autoComplete="off"
                  autoFocus={i === 0}
                  onInput={() => bumpRevision((n) => n + 1)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  className={cn(
                    bubbleStyle("MultiLineInput_default_"),
                    "pointer-events-auto min-h-[96px] w-full resize-none focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2 pt-2">
          <Button variant="cta" size="lg" onClick={handleSubmit} className="group" type="button">
            See my progress
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-xs text-muted-foreground">
            {answeredCount === 0
              ? "You can skip these and continue."
              : `${answeredCount} of ${questions.length} answered`}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ReassessmentReflections;
