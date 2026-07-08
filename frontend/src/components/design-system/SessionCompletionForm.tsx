import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import {
  SessionQuestionCell,
  type PathQuestionData,
} from "./SessionQuestionCell";

/** Bubble custom.pathsession fields used by RE - session completion form (bTIyi). */
export type PathSessionFormData = {
  /** title_text binding → bTIxC */
  title_text: string;
  /** coaching_text_text binding → bTIxG */
  coaching_text_text: string;
  /** micro_commitment_text binding → bTIzX */
  micro_commitment_text: string;
  /** pathquestion list for RepeatingGroup bTIzA */
  questions: PathQuestionData[];
};

export type SessionCompletionFormProps = {
  session: PathSessionFormData;
  answers?: Record<string, string>;
  onAnswerChange?: (questionId: string, value: string) => void;
  reflectionChecked?: boolean;
  onReflectionChange?: (checked: boolean) => void;
  onSubmit?: () => void;
  className?: string;
};

const SUBMIT_LABEL = "Submit answers";
const MICRO_COMMITMENT_LABEL = "Micro-commitment";
const REFLECTION_CHECKBOX_LABEL = "Set as focus";

/**
 * RE - session completion form (bTIyi): session header, question list,
 * reflection checkbox, and submit — presentation-only (no Supabase mutations).
 */
export function SessionCompletionForm({
  session,
  answers = {},
  onAnswerChange,
  reflectionChecked = false,
  onReflectionChange,
  onSubmit,
  className,
}: SessionCompletionFormProps) {
  const reflectionId = "session-completion-reflection";

  return (
    <form
      data-bubble-id="bTIyi"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col gap-6",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <div data-bubble-id="bTJBC" className="hidden" aria-hidden="true" />

      <div data-bubble-id="bTIyn" className="flex flex-col gap-2">
        <h2
          data-bubble-id="bTIxC"
          className={bubbleStyle("Text_heading_2_")}
        >
          {session.title_text}
        </h2>
        <p
          data-bubble-id="bTIxG"
          className={bubbleStyle("Text_body_muted_")}
        >
          {session.coaching_text_text}
        </p>
      </div>

      <div
        data-bubble-id="bTIzA"
        className={cn(
          bubbleStyle("RepeatingGroup_list_"),
          "flex flex-col gap-5",
        )}
      >
        <div data-bubble-id="bTJBI" className="hidden" aria-hidden="true" />

        {session.questions.map((question) => (
          <SessionQuestionCell
            key={question.id}
            question={question}
            answer={answers[question.id] ?? ""}
            onAnswerChange={
              onAnswerChange
                ? (value) => onAnswerChange(question.id, value)
                : undefined
            }
          />
        ))}
      </div>

      <div data-bubble-id="bTIzS" className="flex flex-col gap-2">
        <span data-bubble-id="bTIzY" className={bubbleStyle("Text_label_")}>
          {MICRO_COMMITMENT_LABEL}
        </span>
        <p
          data-bubble-id="bTIzX"
          className={bubbleStyle("Text_inter_13__400__white_copy_")}
        >
          {session.micro_commitment_text}
        </p>
        <div className="flex items-center gap-2">
          <Checkbox
            id={reflectionId}
            data-bubble-id="bTIzc"
            data-style-ref="Checkbox_default_"
            checked={reflectionChecked}
            onCheckedChange={(checked) =>
              onReflectionChange?.(checked === true)
            }
            disabled={!onReflectionChange}
            className={bubbleStyle("Checkbox_default_")}
          />
          <label
            htmlFor={reflectionId}
            className={bubbleStyle("Text_label_")}
          >
            {REFLECTION_CHECKBOX_LABEL}
          </label>
        </div>
      </div>

      <button
        type="submit"
        data-bubble-id="bTIzk"
        data-style-ref="Button_primary_"
        className={cn(bubbleStyle("Button_primary_"), "w-full")}
        onClick={onSubmit ? undefined : (event) => event.preventDefault()}
      >
        {SUBMIT_LABEL}
      </button>
    </form>
  );
}
