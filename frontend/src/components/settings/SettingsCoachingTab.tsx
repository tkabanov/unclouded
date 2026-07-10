import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { loadCoachingPreference } from "@/lib/settings/coachingPreferencesApi";
import {
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsCoachingTab() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AiCoachingModeSlug | "">("");
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading coaching preferences…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
      >
        <header className="space-y-1">
          <h2 className={bubbleStyle("Text_heading_3_")}>Coaching style</h2>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
            Your AI coaching mode is assigned automatically from your onboarding results and
            ongoing activity.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="coaching-mode" className={bubbleStyle("Text_label_")}>
              Current AI coaching mode
            </Label>
            <p
              id="coaching-mode"
              className={cn(
                bubbleStyle("Input_default_"),
                "flex min-h-10 items-center rounded-md px-3 text-sm capitalize",
              )}
            >
              {mode ? AI_COACHING_MODE_LABELS[mode] : "Not assigned yet"}
            </p>
          </div>

          <div
            className={cn(
              bubbleStyle("Group_badge_accent_"),
              "rounded-md px-4 py-3 text-sm text-muted-foreground",
            )}
          >
            Uncloud360 provides AI coaching only — not therapy, medical care, or crisis
            intervention. In an emergency, call 911 or text 988.
          </div>
        </div>
      </div>
    </div>
  );
}
