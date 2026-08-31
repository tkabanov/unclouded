import { Button } from "@/components/ui/button";
import { CoachRosterCard, PreviousCoachCard } from "@/components/coach/booking/CoachCard";
import type { PreviousCoachAvailability } from "@/components/coach/booking/types";
import type { BookableCoach, PreviousOneOnOneCoach } from "@/lib/coach/coachBookingApi";

type CoachSelectionStepProps = {
  roster: BookableCoach[];
  previousCoaches: PreviousOneOnOneCoach[];
  previousAvailability: Record<string, PreviousCoachAvailability>;
  showFullRoster: boolean;
  hasPreviousCoaches: boolean;
  busy: boolean;
  onViewProfile: (coach: BookableCoach) => void;
  onSelectCoach: (coach: BookableCoach, mode: "manual" | "rebook") => void;
  onChooseAnotherCoach: () => void;
  onMatchMe: () => void;
};

export default function CoachSelectionStep({
  roster,
  previousCoaches,
  previousAvailability,
  showFullRoster,
  hasPreviousCoaches,
  busy,
  onViewProfile,
  onSelectCoach,
  onChooseAnotherCoach,
  onMatchMe,
}: CoachSelectionStepProps) {
  const showPreviousSection = hasPreviousCoaches && !showFullRoster;
  const showRosterSection = showFullRoster || !hasPreviousCoaches;

  return (
    <div className="space-y-3">
      {showPreviousSection ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Rebook with previous coach</p>
          <ul className="space-y-2">
            {previousCoaches.map((coach) => (
              <PreviousCoachCard
                key={coach.id}
                coach={coach}
                availability={
                  previousAvailability[coach.id] ?? {
                    hasSlots: false,
                    unavailableReason: coach.isActive ? "no_slots" : "inactive",
                  }
                }
                busy={busy}
                onViewProfile={onViewProfile}
                onRebook={(selected) => onSelectCoach(selected, "rebook")}
              />
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-full text-xs"
            disabled={busy}
            onClick={onChooseAnotherCoach}
          >
            Choose another coach
          </Button>
        </div>
      ) : null}

      {showRosterSection ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Choose a coach</p>
          {roster.length === 0 ? (
            <p className="text-xs text-muted-foreground">No coaches are available to book right now.</p>
          ) : (
            <ul className="space-y-2">
              {roster.map((coach) => (
                <CoachRosterCard
                  key={coach.id}
                  coach={coach}
                  busy={busy}
                  onViewProfile={onViewProfile}
                  onSelect={(selected) => onSelectCoach(selected, "manual")}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-full text-xs text-muted-foreground"
        disabled={busy || roster.length === 0}
        onClick={onMatchMe}
      >
        Match me with a coach
      </Button>
    </div>
  );
}
