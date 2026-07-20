import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import {
  SessionQuestionCell,
  type PathQuestionData,
} from "./SessionQuestionCell";
import { DIRECTED_WRITING_WITNESS_BANNER } from "@/lib/paths/directedWritingHelpers";

/** Bubble custom.pathsession fields used by RE - session completion form (bTIyi). */
export type PathSessionFormData = {
  /** title binding → bTIxC */
  title: string;
  /** coachingText binding → bTIxG */
  coachingText: string;
  /** microCommitment binding → bTIzX */
  microCommitment: string;
  /** pathSession.index — used for directed-writing final session UX (REQ-15). */
  sessionIndex?: number;
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
  /** REQ-15 Directed Writing — witness banner + optional journal disposition on final session. */
  directedWriting?: boolean;
  showFocusCheckbox?: boolean;
  journalDisposition?: JournalLetterDisposition | null;
  onJournalDispositionChange?: (value: JournalLetterDisposition) => void;
};

export type JournalLetterDisposition = "save" | "discard";

const SUBMIT_LABEL = "Submit answers";
const MICRO_COMMITMENT_LABEL = "Micro-commitment";
/** Developer FAQ: Set as My Focus copies micro_commitment → active focus (optional). */
const REFLECTION_CHECKBOX_LABEL = "Set as My Focus";
const JOURNAL_SAVE_LABEL = "Save letter to my private journal";
const JOURNAL_DISCARD_LABEL = "Discard — do not save to journal";

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
  directedWriting = false,
  showFocusCheckbox = true,
  journalDisposition = null,
  onJournalDispositionChange,
}: SessionCompletionFormProps) {
  const reflectionId = "session-completion-reflection";
  const journalSaveId = "session-completion-journal-save";
  const journalDiscardId = "session-completion-journal-discard";
  const showJournalDisposition = directedWriting && session.sessionIndex === 4;

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

      {directedWriting ? (
        <div
          className={cn(
            bubbleStyle("Group_alert_banner_"),
            "rounded-lg border border-border/60 bg-muted/20 p-3",
          )}
          role="note"
        >
          <p className={bubbleStyle("Text_body_muted_")}>{DIRECTED_WRITING_WITNESS_BANNER}</p>
        </div>
      ) : null}

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
        {showJournalDisposition ? (
          <fieldset className="flex flex-col gap-2">
            <legend className={bubbleStyle("Text_label_")}>Your letter</legend>
            <div className="flex items-center gap-2">
              <input
                id={journalSaveId}
                type="radio"
                name="journal-disposition"
                checked={journalDisposition === "save"}
                onChange={() => onJournalDispositionChange?.("save")}
                disabled={!onJournalDispositionChange}
              />
              <label htmlFor={journalSaveId} className={bubbleStyle("Text_label_")}>
                {JOURNAL_SAVE_LABEL}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id={journalDiscardId}
                type="radio"
                name="journal-disposition"
                checked={journalDisposition === "discard"}
                onChange={() => onJournalDispositionChange?.("discard")}
                disabled={!onJournalDispositionChange}
              />
              <label htmlFor={journalDiscardId} className={bubbleStyle("Text_label_")}>
                {JOURNAL_DISCARD_LABEL}
              </label>
            </div>
          </fieldset>
        ) : null}
        {showFocusCheckbox ? (
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
        ) : null}
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
