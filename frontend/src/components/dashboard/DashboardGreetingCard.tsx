import { useState } from "react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";
import {
  AI_COACHING_MODE_LABELS,
  AI_COACHING_MODE_ORDER,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { updateCoachingModePreference } from "@/lib/dashboard/coachingModeApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import coachAvatar from "@/assets/coach-avatar.png";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default function DashboardGreetingCard() {
  const { user } = useAuth();
  const { refresh } = useUserProfile();
  const {
    firstName,
    classificationName,
    pressureProfile,
    preferredCoachingMode,
    profile,
  } = useDashboardUserContext();
  const [saving, setSaving] = useState(false);

  const greetingName = firstName.trim() ? `${getGreeting()}, ${firstName.trim()}` : getGreeting();

  const handleCoachingModeChange = async (value: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateCoachingModePreference(
        user.id,
        value as AiCoachingModeSlug,
        profile?.onboardingData ?? null,
      );
      await refresh();
    } catch (err) {
      console.error("Failed to update coaching mode", err);
      toast.error("Could not update coaching mode. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-bubble-id="ai_RNbBHXRG"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
      )}
    >
      <div
        data-bubble-id="ai_RNbBHXRH"
        className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 flex-1 flex-row gap-4")}
      >
        <div
          data-bubble-id="ai_RNbBHXRI"
          className={cn(
            bubbleStyle("Image_avatar_"),
            "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20",
          )}
        >
          <img src={coachAvatar} alt="" aria-hidden className="h-full w-full object-cover" />
        </div>

        <div className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 flex-1 flex-col gap-2")}>
          <p
            data-bubble-id="ai_RNbBHXRL"
            className={cn(bubbleStyle("Text_heading_2_"), "text-2xl font-bold tracking-tight md:text-3xl")}
          >
            {greetingName}
          </p>

          <div className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-1.5")}>
            {classificationName ? (
              <span
                data-bubble-id="ai_RNbBHXRN"
                className={cn(
                  bubbleStyle("Group_badge_accent_"),
                  "inline-flex w-fit rounded-md px-2.5 py-0.5 text-xs font-medium capitalize",
                )}
              >
                {classificationName}
              </span>
            ) : null}

            {pressureProfile ? (
              <p
                data-bubble-id="ai_RNbBHXRO"
                className={cn(bubbleStyle("Text_body_muted_"), "text-sm text-muted-foreground")}
              >
                {pressureProfile}
              </p>
            ) : (
              <p
                data-bubble-id="ai_RNbBHXRO"
                className={cn(bubbleStyle("Text_body_muted_"), "text-sm text-muted-foreground")}
              >
                Your dashboard is ready to be personalized.
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        data-bubble-id="bTIVE"
        data-style-ref="Group_transparent_"
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full shrink-0 flex-col gap-2 sm:w-48")}
      >
        <label
          htmlFor="dashboard-coaching-mode"
          data-bubble-id="bTIVK"
          className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}
        >
          My coaching mode
        </label>
        <Select
          value={preferredCoachingMode ?? undefined}
          onValueChange={handleCoachingModeChange}
          disabled={saving || !user}
        >
          <SelectTrigger
            id="dashboard-coaching-mode"
            data-bubble-id="bTIVQ"
            data-style-ref="Dropdown_default_"
            className={cn(bubbleStyle("Dropdown_default_"), "h-10 w-full")}
          >
            <SelectValue placeholder="Select mode" />
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
    </div>
  );
}
