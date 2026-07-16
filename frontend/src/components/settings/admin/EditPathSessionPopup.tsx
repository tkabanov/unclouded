import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  emptyAdminPathSessionForm,
  type AdminPathSessionFormState,
} from "@/lib/settings/admin/adminPathSessionsApi";
import { bubbleStyle } from "@/styles";

export interface EditPathSessionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminPathSessionFormState) => Promise<void>;
  busy?: boolean;
  editSessionId?: string | null;
  initialForm?: AdminPathSessionFormState | null;
}

export default function EditPathSessionPopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editSessionId = null,
  initialForm = null,
}: EditPathSessionPopupProps) {
  const [form, setForm] = useState<AdminPathSessionFormState>(emptyAdminPathSessionForm());
  const isEdit = Boolean(editSessionId);

  useEffect(() => {
    if (open) setForm(initialForm ?? emptyAdminPathSessionForm());
  }, [open, initialForm]);

  const updateQuestion = (index: 0 | 1 | 2, value: string) => {
    setForm((prev) => {
      const questions = [...prev.questions] as [string, string, string];
      questions[index] = value;
      return { ...prev, questions };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit session" : "Add session"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="path-session-title">Title</Label>
            <Input
              id="path-session-title"
              className={bubbleStyle("Input_default_")}
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="path-session-coaching">Coaching text</Label>
            <Textarea
              id="path-session-coaching"
              rows={8}
              value={form.coachingText}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, coachingText: event.target.value }))
              }
            />
          </div>

          {[0, 1, 2].map((index) => (
            <div key={index} className="grid gap-2">
              <Label htmlFor={`path-session-q${index + 1}`}>Question {index + 1}</Label>
              <Textarea
                id={`path-session-q${index + 1}`}
                rows={2}
                value={form.questions[index as 0 | 1 | 2]}
                onChange={(event) =>
                  updateQuestion(index as 0 | 1 | 2, event.target.value)
                }
              />
            </div>
          ))}

          <div className="grid gap-2">
            <Label htmlFor="path-session-micro">Micro-commitment</Label>
            <Textarea
              id="path-session-micro"
              rows={3}
              value={form.microCommitment}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, microCommitment: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="path-session-reassessment-q">
              Reassessment reflection question (final session)
            </Label>
            <Textarea
              id="path-session-reassessment-q"
              rows={3}
              placeholder="Path-adaptive question shown at 90-day reassessment when this path is completed…"
              value={form.reassessmentReflectionQuestion}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  reassessmentReflectionQuestion: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void onSubmit(form)}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
