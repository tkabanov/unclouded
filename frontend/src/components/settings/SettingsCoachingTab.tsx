import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COACHING_CARD_HEADER_BUBBLE_ID,
  COACHING_DISCLAIMER_BANNER_BUBBLE_ID,
  COACHING_FORM_BUBBLE_ID,
  COACHING_FORM_CARD_BUBBLE_ID,
  COACHING_MODE_DROPDOWN_BUBBLE_ID,
  COACHING_PANEL_BUBBLE_ID,
  COACHING_SAVE_BTN_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  loadCoachingPreference,
  saveCoachingPreference,
} from "@/lib/settings/coachingPreferencesApi";
import {
  AI_COACHING_MODE_LABELS,
  AI_COACHING_MODE_ORDER,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsCoachingTab() {
  const { user } = useAuth();
  const { refresh } = useUserProfile();
  const [mode, setMode] = useState<AiCoachingModeSlug | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    loadCoachingPreference(user.id)
      .then((value) => {
        if (!cancelled) setMode(value);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load coaching preferences.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      await saveCoachingPreference(user.id, mode);
      await refresh();
      const saved = await loadCoachingPreference(user.id);
      setMode(saved);
      toast.success("Coaching preferences saved.");
    } catch {
      toast.error("Couldn't save coaching preferences.");
    } finally {
      setSaving(false);
    }
  }, [mode, refresh, saving, user]);

  if (loading) {
    return (
      <div data-bubble-id={COACHING_PANEL_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading coaching preferences…
      </div>
    );
  }

  return (
    <div data-bubble-id={COACHING_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
      <div
        data-bubble-id={COACHING_FORM_CARD_BUBBLE_ID}
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
      >
        <header data-bubble-id={COACHING_CARD_HEADER_BUBBLE_ID} className="space-y-1">
          <h2 className={bubbleStyle("Text_heading_3_")}>Coaching style</h2>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
            Choose how your AI coach communicates with you.
          </p>
        </header>

        <div data-bubble-id={COACHING_FORM_BUBBLE_ID} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="coaching-mode" className={bubbleStyle("Text_label_")}>
              AI coaching mode
            </Label>
            <Select
              value={mode || undefined}
              onValueChange={(value) => setMode(value as AiCoachingModeSlug)}
            >
              <SelectTrigger
                id="coaching-mode"
                data-bubble-id={COACHING_MODE_DROPDOWN_BUBBLE_ID}
                className={bubbleStyle("Input_default_")}
              >
                <SelectValue placeholder="Select a coaching mode" />
              </SelectTrigger>
              <SelectContent>
                {AI_COACHING_MODE_ORDER.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {AI_COACHING_MODE_LABELS[slug]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            data-bubble-id={COACHING_DISCLAIMER_BANNER_BUBBLE_ID}
            className={cn(
              bubbleStyle("Group_badge_accent_"),
              "rounded-md px-4 py-3 text-sm text-muted-foreground",
            )}
          >
            Uncloud360 provides AI coaching only — not therapy, medical care, or crisis
            intervention. In an emergency, call 911 or text 988.
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            data-bubble-id={COACHING_SAVE_BTN_BUBBLE_ID}
            className={bubbleStyle("Button_primary_")}
            disabled={saving || !mode}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
