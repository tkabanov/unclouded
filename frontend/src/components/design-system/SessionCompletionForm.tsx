import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import {
  SessionQuestionCell,
  type PathQuestionData,
} from "./SessionQuestionCell";

/** Bubble custom.pathsession fields used by RE - session completion form (bTIyi). */
export type PathSessionFormData = {
  /** title binding → bTIxC */
  title: string;
  /** coachingText binding → bTIxG */
  coachingText: string;
  /** microCommitment binding → bTIzX */
  microCommitment: string;
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
/** Developer FAQ: Set as My Focus copies micro_commitment → active focus (optional). */
const REFLECTION_CHECKBOX_LABEL = "Set as My Focus";

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
      <div className="hidden" aria-hidden="true" />

      <div className="flex flex-col gap-2">
        <h2
          className={bubbleStyle("Text_heading_2_")}
        >
          {session.title}
        </h2>
        <p
          className={bubbleStyle("Text_body_muted_")}
        >
          {session.coachingText}
        </p>
      </div>

      <div
        className={cn(
          bubbleStyle("RepeatingGroup_list_"),
          "flex flex-col gap-5",
        )}
      >
        <div className="hidden" aria-hidden="true" />

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

      <div className="flex flex-col gap-2">
        <span className={bubbleStyle("Text_label_")}>
          {MICRO_COMMITMENT_LABEL}
        </span>
        <p
          className={bubbleStyle("Text_inter_13__400__white_copy_")}
        >
          {session.microCommitment}
        </p>
        <div className="flex items-center gap-2">
          <Checkbox
            id={reflectionId}
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
        data-style-ref="Button_primary_"
        className={cn(bubbleStyle("Button_primary_"), "w-full")}
        onClick={onSubmit ? undefined : (event) => event.preventDefault()}
      >
        {SUBMIT_LABEL}
      </button>
    </form>
  );
}
