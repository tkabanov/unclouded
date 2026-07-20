import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { useUserProfile } from "@/lib/userProfile";
import { readSessionLifecycleState } from "@/lib/chat/chatSessionLifecycleApi";
import {
  COMMITMENT_FOLLOW_THROUGH_OPTIONS,
  fetchDailyCheckInStreak,
  submitDailyCheckIn,
} from "@/lib/dashboard/checkinApi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const moodValueClass = cn(
  bubbleStyle("Text_label_"),
  "text-sm font-semibold text-primary",
);

interface CheckinSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  "aria-label"?: string;
}

function CheckinSlider({
  value,
  onChange,
  min = 1,
  max = 10,
  "aria-label": ariaLabel,
}: CheckinSliderProps) {
  return (
    <Slider
      value={[value]}
      onValueChange={([next]) => onChange(next ?? min)}
      min={min}
      max={max}
      step={1}
      aria-label={ariaLabel}
      className={cn(
        "w-full py-1",
        "[&>span:first-child]:h-2 [&>span:first-child]:bg-muted",
        "[&>span:first-child>span]:bg-primary",
        "[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0",
        "[&_[role=slider]]:bg-primary",
        "[&_[role=slider]]:shadow-none focus-visible:[&_[role=slider]]:ring-2 focus-visible:[&_[role=slider]]:ring-primary/30",
      )}
    />
  );
}

export default function DashboardCheckinCard() {
  const { user } = useAuth();
  const { profile } = useDashboardUserContext();
  const { refresh } = useUserProfile();
  const [mood, setMood] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [reflection, setReflection] = useState("");
  const [commitmentFollowThrough, setCommitmentFollowThrough] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [loadingStreak, setLoadingStreak] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const activeMicroCommitment = useMemo(
    () => readSessionLifecycleState(profile?.onboardingData ?? null).activeMicroCommitment,
    [profile?.onboardingData],
  );

  const loadStreak = useCallback(async () => {
    if (!user) {
      setStreak(0);
      setLoadingStreak(false);
      return;
    }

    setLoadingStreak(true);
    try {
      const value = await fetchDailyCheckInStreak(user.id, profile?.onboardingData ?? null);
      setStreak(value);
    } catch (err) {
      console.error("Failed to load check-in streak", err);
      setStreak(0);
    } finally {
      setLoadingStreak(false);
    }
  }, [user, profile?.onboardingData]);

  useEffect(() => {
    void loadStreak();
  }, [loadStreak]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const result = await submitDailyCheckIn(
        user.id,
        {
          mood,
          energyStressLevel: energy,
          reflection,
          microCommitmentStatus: commitmentFollowThrough,
        },
        profile?.onboardingData ?? null,
      );
      setStreak(result.streak);
      setReflection("");
      setCommitmentFollowThrough(null);
      await refresh();
      toast.success("Check-in saved.");
    } catch (err) {
      console.error("Failed to submit daily check-in", err);
      toast.error("Could not save your check-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4")}
    >
      <div
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex w-full flex-row items-center justify-between gap-4",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
        >
          <Heart
            className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")}
            aria-hidden
          />
          <h2
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}
          >
            Daily Check-In
          </h2>
        </div>

        {!loadingStreak && streak > 0 ? (
          <div
            data-style-ref="Group_badge_primary_"
            className={cn(
              bubbleStyle("Group_badge_primary_"),
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-foreground",
            )}
          >
            <Flame
              className={cn(bubbleStyle("Icon_default_"), "h-3.5 w-3.5")}
              aria-hidden
            />
            <span>
              {streak} day streak
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-4")}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
        >
          <p className={moodValueClass}>Mood: {mood}</p>
          <CheckinSlider value={mood} onChange={setMood} aria-label="Mood" />
        </div>

        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
        >
          <p className={moodValueClass}>
            Energy level: {energy}
          </p>
          <CheckinSlider value={energy} onChange={setEnergy} aria-label="Energy level" />
        </div>

        {activeMicroCommitment ? (
          <div
            className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
            role="group"
            aria-labelledby="dashboard-checkin-commitment-label"
          >
            <p
              id="dashboard-checkin-commitment-label"
              className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}
            >
              Did you follow through on your commitment?
            </p>
            <p className={cn(bubbleStyle("Text_body_"), "text-sm text-muted-foreground")}>
              {activeMicroCommitment}
            </p>
            <p className="text-xs text-muted-foreground">No judgment — pick what fits today.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {COMMITMENT_FOLLOW_THROUGH_OPTIONS.map((option) => {
                const selected = commitmentFollowThrough === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    data-style-ref={selected ? "Button_primary_" : "Button_secondary_"}
                    className={cn(
                      selected ? bubbleStyle("Button_primary_") : bubbleStyle("Button_secondary_"),
                      "h-9 w-full text-sm",
                    )}
                    aria-pressed={selected}
                    onClick={() =>
                      setCommitmentFollowThrough((current) =>
                        current === option.value ? null : option.value,
                      )
                    }
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-1")}
        >
          <label
            htmlFor="dashboard-checkin-reflection"
            className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}
          >
            Brief reflection
          </label>
          <textarea
            id="dashboard-checkin-reflection"
            data-style-ref="MultiLineInput_default_"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="What's on your mind today? E.g., 'Focused morning, tough afternoon meeting...'"
            rows={3}
            className={cn(bubbleStyle("MultiLineInput_default_"), "min-h-[96px] w-full resize-none")}
          />
        </div>

        <Button
          type="button"
          data-style-ref="Button_primary_"
          className={cn(bubbleStyle("Button_primary_"), "h-10 w-full")}
          disabled={submitting || !user}
          onClick={() => void handleSubmit()}
        >
          Submit Check-In
        </Button>
      </div>
    </div>
  );
}
