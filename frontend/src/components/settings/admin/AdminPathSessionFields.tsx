import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminPathSessionFormState } from "@/lib/settings/admin/adminPathSessionsApi";
import { bubbleStyle } from "@/styles";

export interface AdminPathSessionFieldsProps {
  idPrefix: string;
  value: AdminPathSessionFormState;
  onChange: (next: AdminPathSessionFormState) => void;
  disabled?: boolean;
}

export default function AdminPathSessionFields({
  idPrefix,
  value,
  onChange,
  disabled = false,
}: AdminPathSessionFieldsProps) {
  const updateQuestion = (index: 0 | 1 | 2, questionText: string) => {
    const questions = [...value.questions] as [string, string, string];
    questions[index] = questionText;
    onChange({ ...value, questions });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          className={bubbleStyle("Input_default_")}
          value={value.title}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-coaching`}>Coaching text</Label>
        <Textarea
          id={`${idPrefix}-coaching`}
          rows={6}
          value={value.coachingText}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, coachingText: event.target.value })}
        />
      </div>

      {([0, 1, 2] as const).map((index) => (
        <div key={index} className="grid gap-2">
          <Label htmlFor={`${idPrefix}-q${index + 1}`}>Question {index + 1}</Label>
          <Textarea
            id={`${idPrefix}-q${index + 1}`}
            rows={2}
            value={value.questions[index]}
            disabled={disabled}
            onChange={(event) => updateQuestion(index, event.target.value)}
          />
        </div>
      ))}

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-micro`}>Micro-commitment</Label>
        <Textarea
          id={`${idPrefix}-micro`}
          rows={3}
          value={value.microCommitment}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, microCommitment: event.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-reassessment-q`}>
          Reassessment reflection question (final session)
        </Label>
        <Textarea
          id={`${idPrefix}-reassessment-q`}
          rows={3}
          placeholder="Path-adaptive question shown at 90-day reassessment when this path is completed…"
          value={value.reassessmentReflectionQuestion}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, reassessmentReflectionQuestion: event.target.value })
          }
        />
      </div>
    </div>
  );
}
