import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

/** Bubble custom.pathquestion row bound to RepeatingGroup cell bTIzF. */
export type PathQuestionData = {
  id: string;
  /** questionText binding → label bTIzG */
  questionText: string;
};

export type SessionQuestionCellProps = {
  question: PathQuestionData;
  answer?: string;
  onAnswerChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const DEFAULT_PLACEHOLDER = "Your answer…";

/**
 * RepeatingGroup cell (bTIzF): question label and multiline answer input.
 */
export function SessionQuestionCell({
  question,
  answer = "",
  onAnswerChange,
  placeholder = DEFAULT_PLACEHOLDER,
  className,
}: SessionQuestionCellProps) {
  return (
    <div
      className={cn("flex w-full flex-col gap-2", className)}
    >
      <label
        className={bubbleStyle("Text_label_")}
        htmlFor={`session-answer-${question.id}`}
      >
        {question.questionText}
      </label>
      <Textarea
        id={`session-answer-${question.id}`}
        data-style-ref="MultiLineInput_default_"
        value={answer}
        onChange={(event) => onAnswerChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={!onAnswerChange}
        className={cn(bubbleStyle("MultiLineInput_default_"), "min-h-[96px]")}
      />
    </div>
  );
}
