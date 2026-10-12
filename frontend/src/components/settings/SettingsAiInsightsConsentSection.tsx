import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAiInsightsConsent } from "@/hooks/useAiInsightsConsent";
import { AI_INSIGHTS_SETTINGS_COPY as COPY } from "@/lib/aiInsights/aiInsightsConsentCopy";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

/**
 * NCLDD-55 (OVR-073) — Settings → Profile: anonymized AI conversation analysis.
 * Copy (aiInsightsConsentCopy.ts) is DRAFT, pending legal approval. Turning it off deletes the user's
 * non-aggregated Insights records; AI access is unaffected either way.
 */
export function SettingsAiInsightsConsentSection() {
  const { state, saveChoice } = useAiInsightsConsent();
  const [saving, setSaving] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  if (!state || state.status === "unavailable") return null;

  const enabled = state.granted === true;

  const save = async (granted: boolean) => {
    setSaving(true);
    try {
      await saveChoice(granted, "settings");
      toast.success(granted ? COPY.savedOn : COPY.savedOff);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your choice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-4 p-6")}>
      <header className="space-y-1">
        <h2 className={bubbleStyle("Text_heading_2_")}>{COPY.title}</h2>
        <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
          {COPY.description}
        </p>
      </header>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="ai-insights-consent" className={bubbleStyle("Text_label_")}>
            {COPY.switchLabel}
          </Label>
          <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
            {COPY.switchHint}
          </p>
        </div>
        <Switch
          id="ai-insights-consent"
          checked={enabled}
          disabled={saving}
          onCheckedChange={(checked) => {
            if (checked) void save(true);
            else setConfirmOff(true);
          }}
        />
      </div>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{COPY.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{COPY.confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{COPY.confirmKeep}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void save(false)}>{COPY.confirmOff}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
