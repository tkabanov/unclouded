import { useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AI_INSIGHTS_CONSENT_COPY } from "@/lib/aiInsights/aiInsightsConsentCopy";

export type AiInsightsConsentDialogProps = {
  open: boolean;
  onChoose: (granted: boolean) => Promise<void>;
};

/** Blocking first-use choice: no close button, Escape or outside click — only the two answers. */
export function AiInsightsConsentDialog({ open, onChoose }: AiInsightsConsentDialogProps) {
  const [saving, setSaving] = useState<boolean | null>(null);

  const choose = async (granted: boolean) => {
    if (saving !== null) return;
    setSaving(granted);
    try {
      await onChoose(granted);
    } finally {
      setSaving(null);
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{AI_INSIGHTS_CONSENT_COPY.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{AI_INSIGHTS_CONSENT_COPY.body}</p>
              <p>{AI_INSIGHTS_CONSENT_COPY.access}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving !== null}
            onClick={() => void choose(false)}
          >
            {saving === false ? "Saving…" : AI_INSIGHTS_CONSENT_COPY.decline}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving !== null}
            onClick={() => void choose(true)}
          >
            {saving === true ? "Saving…" : AI_INSIGHTS_CONSENT_COPY.allow}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
