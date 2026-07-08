import { useCallback, useEffect, useState } from "react";
import { Flame, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { useUserProfile } from "@/lib/userProfile";
import {
  fetchDailyCheckInStreak,
  submitDailyCheckIn,
} from "@/lib/dashboard/checkinApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CHECKIN_SLIDER_HANDLE = "hsla(188, 52%, 36%, 1)";

const moodValueClass = cn(
  bubbleStyle("Text_label_"),
  "text-sm font-semibold text-[var(--color_primary_default)]",
);

interface CheckinSliderProps {
  bubbleId: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

function CheckinSlider({ bubbleId, value, onChange, min = 1, max = 10 }: CheckinSliderProps) {
  return (
    <input
      type="range"
      data-bubble-id={bubbleId}
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--color_aiRNbAaxgw_default)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[hsla(188,52%,36%,1)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsla(188,52%,36%,1)]"
      style={{ accentColor: CHECKIN_SLIDER_HANDLE }}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
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
  const [streak, setStreak] = useState(0);
  const [loadingStreak, setLoadingStreak] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
        },
        profile?.onboardingData ?? null,
      );
      setStreak(result.streak);
      setReflection("");
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
      data-bubble-id="ai_RNbBHXRY"
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4")}
    >
      <div
        data-bubble-id="ai_RNbBHXRZ"
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex w-full flex-row items-center justify-between gap-4",
        )}
      >
        <div
          data-bubble-id="ai_RNbBHXRa"
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
        >
          <Heart
            data-bubble-id="ai_RNbBHXRb"
            className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")}
            aria-hidden
          />
          <h2
            data-bubble-id="ai_RNbBHXRc"
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}
          >
            Daily Check-In
          </h2>
        </div>

        {!loadingStreak && streak > 0 ? (
          <div
            data-bubble-id="ai_RNbBHXRd"
            data-style-ref="Group_badge_primary_"
            className={cn(
              bubbleStyle("Group_badge_primary_"),
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--color_primary_contrast_default)]",
            )}
          >
            <Flame
              data-bubble-id="ai_RNbBHXRe"
              className={cn(bubbleStyle("Icon_default_"), "h-3.5 w-3.5")}
              aria-hidden
            />
            <span data-bubble-id="ai_RNbBHXRf">
              {streak} day streak
            </span>
          </div>
        ) : null}
      </div>

      <div
        data-bubble-id="ai_RNbBHXRg"
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-4")}
      >
        <div
          data-bubble-id="ai_RNbBHXRh"
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
        >
          <div
            data-bubble-id="ai_RNbBHXRi"
            className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-1")}
          >
            <span
              data-bubble-id="bTIXh"
              className={moodValueClass}
            >
              Mood: {mood}
            </span>
            <span
              data-bubble-id="ai_RNbBHXRj"
              className={moodValueClass}
              aria-hidden
            >
              {mood}
            </span>
          </div>
          <CheckinSlider bubbleId="ai_RNbBHXRk" value={mood} onChange={setMood} />
        </div>

        <div
          data-bubble-id="ai_RNbBHXRl"
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
        >
          <p data-bubble-id="ai_RNbBHXRn" className={moodValueClass}>
            Energy level: {energy}
          </p>
          <CheckinSlider bubbleId="ai_RNbBHXRo" value={energy} onChange={setEnergy} />
        </div>

        <div
          data-bubble-id="ai_RNbBHXRp"
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-1")}
        >
          <label
            htmlFor="dashboard-checkin-reflection"
            data-bubble-id="ai_RNbBHXRq"
            className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}
          >
            Brief reflection
          </label>
          <textarea
            id="dashboard-checkin-reflection"
            data-bubble-id="ai_RNbBHXRr"
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
          data-bubble-id="ai_RNbBHXRw"
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
