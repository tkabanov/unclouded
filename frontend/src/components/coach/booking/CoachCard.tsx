import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import type { PreviousCoachAvailability } from "@/components/coach/booking/types";
import type { BookableCoach, PreviousOneOnOneCoach } from "@/lib/coach/coachBookingApi";
import { cn } from "@/lib/utils";

type CoachAvatarProps = {
  coach: BookableCoach;
  size?: "sm" | "md";
};

function CoachAvatar({ coach, size = "md" }: CoachAvatarProps) {
  const sizeClass = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  if (coach.imageUrl) {
    return (
      <img
        src={coach.imageUrl}
        alt=""
        className={cn(sizeClass, "shrink-0 rounded-full border object-cover")}
      />
    );
  }
  return <div className={cn(sizeClass, "shrink-0 rounded-full border bg-muted")} />;
}

type CoachRosterCardProps = {
  coach: BookableCoach;
  busy: boolean;
  onViewProfile: (coach: BookableCoach) => void;
  onSelect: (coach: BookableCoach) => void;
};

export function CoachRosterCard({ coach, busy, onViewProfile, onSelect }: CoachRosterCardProps) {
  return (
    <li className="rounded-md border border-border/60 p-2.5">
      <div className="flex items-start gap-2.5">
        <CoachAvatar coach={coach} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{coach.name}</p>
          {coach.bio ? (
            <p className="line-clamp-2 text-[11px] text-muted-foreground">{coach.bio}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={busy}
          onClick={() => onViewProfile(coach)}
        >
          View profile
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          disabled={busy}
          onClick={() => onSelect(coach)}
        >
          Select coach
        </Button>
      </div>
    </li>
  );
}

type PreviousCoachCardProps = {
  coach: PreviousOneOnOneCoach;
  availability: PreviousCoachAvailability;
  busy: boolean;
  onViewProfile: (coach: BookableCoach) => void;
  onRebook: (coach: BookableCoach) => void;
};

export function PreviousCoachCard({
  coach,
  availability,
  busy,
  onViewProfile,
  onRebook,
}: PreviousCoachCardProps) {
  const unavailable = !coach.isActive || !availability.hasSlots;
  const unavailableMessage = !coach.isActive
    ? `${coach.name} isn't available right now.`
    : !availability.hasSlots
      ? `${coach.name} has no open times in the next two weeks.`
      : null;

  return (
    <li
      className={cn(
        "rounded-md border border-border/60 p-2.5",
        unavailable && "bg-muted/20 opacity-90",
      )}
    >
      <div className="flex items-start gap-2.5">
        <CoachAvatar coach={coach} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{coach.name}</p>
          <p className="text-[11px] text-muted-foreground">
            Last session · {format(new Date(coach.lastSessionAt), "MMM d, yyyy")}
          </p>
          {coach.bio ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{coach.bio}</p>
          ) : null}
          {unavailableMessage ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{unavailableMessage}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={busy}
          onClick={() => onViewProfile(coach)}
        >
          View profile
        </Button>
        {!unavailable ? (
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            disabled={busy}
            onClick={() => onRebook(coach)}
          >
            Rebook with {coach.name}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
