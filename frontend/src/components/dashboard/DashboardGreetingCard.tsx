import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import {
  AI_COACHING_MODE_LABELS,
} from "@/lib/enums/coachingMode";
import coachAvatar from "@/assets/coach-avatar.png";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default function DashboardGreetingCard() {
  const {
    firstName,
    classificationName,
    pressureProfile,
    preferredCoachingMode,
  } = useDashboardUserContext();

  const greetingName = firstName.trim() ? `${getGreeting()}, ${firstName.trim()}` : getGreeting();
  const coachingModeLabel = preferredCoachingMode
    ? AI_COACHING_MODE_LABELS[preferredCoachingMode]
    : null;

  return (
    <div
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
      )}
    >
      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 flex-1 flex-row gap-4")}
      >
        <div
          className={cn(
            bubbleStyle("Image_avatar_"),
            "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20",
          )}
        >
          <img src={coachAvatar} alt="" aria-hidden className="h-full w-full object-cover" />
        </div>

        <div className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 flex-1 flex-col gap-2")}>
          <p
            className={cn(bubbleStyle("Text_heading_2_"), "text-2xl font-bold tracking-tight md:text-3xl")}
          >
            {greetingName}
          </p>

          <div className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-1.5")}>
            {classificationName ? (
              <span
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
                className={cn(bubbleStyle("Text_body_muted_"), "text-sm text-muted-foreground")}
              >
                {pressureProfile}
              </p>
            ) : (
              <p
                className={cn(bubbleStyle("Text_body_muted_"), "text-sm text-muted-foreground")}
              >
                Your dashboard is ready to be personalized.
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        data-style-ref="Group_transparent_"
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full shrink-0 flex-col gap-2 sm:w-48")}
      >
        <p className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}>
          My coaching mode
        </p>
        <p
          className={cn(
            bubbleStyle("Group_badge_accent_"),
            "inline-flex min-h-10 w-full items-center rounded-md px-3 text-sm capitalize",
          )}
        >
          {coachingModeLabel ?? "Assigning…"}
        </p>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-xs text-muted-foreground")}>
          Assigned automatically based on your profile and activity.
        </p>
      </div>
    </div>
  );
}
