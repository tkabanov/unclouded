import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { toast } from "sonner";

import CoachProfileSheet from "@/components/coach/booking/CoachProfileSheet";
import CoachSelectionStep from "@/components/coach/booking/CoachSelectionStep";
import SlotSelectionStep from "@/components/coach/booking/SlotSelectionStep";
import {
  SLOT_LOOKAHEAD_DAYS,
  type BookingError,
  type BookingMode,
  type BookingStep,
  type PreviousCoachAvailability,
} from "@/components/coach/booking/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cancelOneOnOneBooking,
  confirmOneOnOneBooking,
  fetchMyCoachBookings,
  formatCoachBookingStatusLabel,
  listActiveCoachesForBooking,
  listBookableOneOnOneSlots,
  listBookableOneOnOneSlotsAnyCoach,
  listMyPreviousOneOnOneCoaches,
  type BookableCoach,
  type BookableOneOnOneSlot,
  type CoachBookingRow,
  type PreviousOneOnOneCoach,
} from "@/lib/coach/coachBookingApi";
import { cn } from "@/lib/utils";

function isUpcomingConfirmed(row: CoachBookingRow): boolean {
  if (row.status !== "confirmed" || !row.scheduledAt) return false;
  return new Date(row.scheduledAt).getTime() > Date.now();
}

function resolveBookingError(code: string, message: string): BookingError {
  if (code === "specialist_unavailable") {
    return {
      code,
      message: message || "That coach is no longer available.",
      action: "chooseCoach",
    };
  }
  if (code === "slot_unavailable" || code === "slot_in_past") {
    return {
      code,
      message: message || "That time was just taken.",
      action: "pickTime",
    };
  }
  return {
    code,
    message: message || "Could not create your booking. Please try again.",
    action: "pickTime",
  };
}

type OneOnOneBookingPanelProps = {
  bookable: boolean;
  locked: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onBooked: () => void | Promise<void>;
  onPremiumRequired: () => void;
  helperText: string;
};

export default function OneOnOneBookingPanel({
  bookable,
  locked,
  busy,
  onBusyChange,
  onBooked,
  onPremiumRequired,
  helperText,
}: OneOnOneBookingPanelProps) {
  const [step, setStep] = useState<BookingStep>("chooseCoach");
  const [bookingMode, setBookingMode] = useState<BookingMode>("manual");
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [slots, setSlots] = useState<BookableOneOnOneSlot[]>([]);
  const [history, setHistory] = useState<CoachBookingRow[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookableOneOnOneSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [roster, setRoster] = useState<BookableCoach[]>([]);
  const [previousCoaches, setPreviousCoaches] = useState<PreviousOneOnOneCoach[]>([]);
  const [previousAvailability, setPreviousAvailability] = useState<
    Record<string, PreviousCoachAvailability>
  >({});
  const [selectedCoach, setSelectedCoach] = useState<BookableCoach | null>(null);
  const [showFullRoster, setShowFullRoster] = useState(false);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [profileCoach, setProfileCoach] = useState<BookableCoach | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bookingError, setBookingError] = useState<BookingError | null>(null);

  const rangeFrom = useMemo(() => startOfDay(new Date()), []);
  const rangeTo = useMemo(
    () => endOfDay(addDays(new Date(), SLOT_LOOKAHEAD_DAYS)),
    [],
  );

  const reloadHistory = useCallback(async () => {
    try {
      const rows = await fetchMyCoachBookings(10);
      setHistory(rows);
    } catch {
      setHistory([]);
    }
  }, []);

  const loadPreviousAvailability = useCallback(
    async (coaches: PreviousOneOnOneCoach[]): Promise<Record<string, PreviousCoachAvailability>> => {
      const entries = await Promise.all(
        coaches.map(async (coach) => {
          if (!coach.isActive) {
            return [coach.id, { hasSlots: false, unavailableReason: "inactive" as const }] as const;
          }
          try {
            const coachSlots = await listBookableOneOnOneSlots(rangeFrom, rangeTo, coach.id);
            return [
              coach.id,
              coachSlots.length > 0
                ? { hasSlots: true }
                : { hasSlots: false, unavailableReason: "no_slots" as const },
            ] as const;
          } catch {
            return [coach.id, { hasSlots: false, unavailableReason: "no_slots" as const }] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    [rangeFrom, rangeTo],
  );

  const reloadSlots = useCallback(async () => {
    if (step !== "chooseSlot") return;

    setLoadingSlots(true);
    try {
      if (bookingMode === "autoMatch") {
        const next = await listBookableOneOnOneSlotsAnyCoach(rangeFrom, rangeTo);
        setSlots(next);
        return;
      }

      if (!selectedCoach) {
        setSlots([]);
        return;
      }

      const next = await listBookableOneOnOneSlots(rangeFrom, rangeTo, selectedCoach.id);
      setSlots(next);
    } catch {
      toast.error("Couldn't load available times.");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [bookingMode, rangeFrom, rangeTo, selectedCoach, step]);

  const bootstrapCoaches = useCallback(async () => {
    if (!bookable) return;
    setLoadingCoaches(true);
    try {
      const [coaches, previous] = await Promise.all([
        listActiveCoachesForBooking(),
        listMyPreviousOneOnOneCoaches(),
      ]);
      setRoster(coaches);
      setPreviousCoaches(previous);
      setPreviousAvailability(await loadPreviousAvailability(previous));
      setShowFullRoster(previous.length === 0);
      setStep("chooseCoach");
      setBookingMode("manual");
      setSelectedCoach(null);
      setSelectedSlot(null);
      setBookingError(null);
    } catch {
      toast.error("Couldn't load coaches.");
      setRoster([]);
      setPreviousCoaches([]);
      setPreviousAvailability({});
      setShowFullRoster(true);
    } finally {
      setLoadingCoaches(false);
    }
  }, [bookable, loadPreviousAvailability]);

  useEffect(() => {
    void reloadHistory();
  }, [reloadHistory]);

  useEffect(() => {
    void bootstrapCoaches();
  }, [bootstrapCoaches]);

  useEffect(() => {
    void reloadSlots();
  }, [reloadSlots]);

  const goToCoachStep = useCallback(() => {
    setStep("chooseCoach");
    setBookingMode("manual");
    setSelectedCoach(null);
    setSelectedSlot(null);
    setSlots([]);
    setBookingError(null);
  }, []);

  const goToSlotStep = useCallback((coach: BookableCoach | null, mode: BookingMode) => {
    setSelectedCoach(coach);
    setBookingMode(mode);
    setSelectedSlot(null);
    setBookingError(null);
    setStep("chooseSlot");
  }, []);

  const handleSelectCoach = useCallback(
    (coach: BookableCoach, mode: "manual" | "rebook") => {
      goToSlotStep(coach, mode);
    },
    [goToSlotStep],
  );

  const handleMatchMe = useCallback(() => {
    goToSlotStep(null, "autoMatch");
  }, [goToSlotStep]);

  const handleViewProfile = useCallback((coach: BookableCoach) => {
    setProfileCoach(coach);
    setProfileOpen(true);
  }, []);

  const handleProfileBook = useCallback(
    (coach: BookableCoach) => {
      handleSelectCoach(coach, "manual");
    },
    [handleSelectCoach],
  );

  const handleConfirm = useCallback(async () => {
    if (!bookable) {
      onPremiumRequired();
      return;
    }
    if (!selectedSlot || busy) return;
    if (bookingMode !== "autoMatch" && !selectedCoach) return;

    onBusyChange(true);
    setBookingError(null);
    try {
      const result = await confirmOneOnOneBooking({
        slotStart: selectedSlot.slotStart,
        durationMinutes: selectedSlot.durationMinutes,
        specialistId: bookingMode === "autoMatch" ? null : selectedCoach?.id,
      });

      if (result.status === "blocked") {
        if (result.code === "premium_required") {
          onPremiumRequired();
        } else {
          setBookingError(resolveBookingError(result.code, result.message));
        }
        await reloadSlots();
        await onBooked();
        return;
      }

      const coachLabel = result.specialistName?.trim();
      toast.success(
        coachLabel
          ? `Session booked with ${coachLabel} — you'll get a confirmation email with session details.`
          : result.kotaRead
            ? "Session booked — confirmation is on the way, and Kota's Read was prepared for your coach."
            : "Session booked — you'll get a confirmation email with session details.",
      );
      setSelectedSlot(null);
      setBookingError(null);
      await Promise.all([bootstrapCoaches(), reloadHistory(), onBooked()]);
    } finally {
      onBusyChange(false);
    }
  }, [
    bookable,
    bookingMode,
    bootstrapCoaches,
    busy,
    onBooked,
    onBusyChange,
    onPremiumRequired,
    reloadHistory,
    reloadSlots,
    selectedCoach,
    selectedSlot,
  ]);

  const handleBookingErrorAction = useCallback(() => {
    if (!bookingError) return;
    setBookingError(null);
    if (bookingError.action === "chooseCoach") {
      goToCoachStep();
      setShowFullRoster(true);
      return;
    }
    setSelectedSlot(null);
    void reloadSlots();
  }, [bookingError, goToCoachStep, reloadSlots]);

  const handleCancel = useCallback(
    async (bookingId: string) => {
      if (busy) return;
      onBusyChange(true);
      try {
        const result = await cancelOneOnOneBooking(bookingId);
        if (result.status === "blocked") {
          toast.error(result.message);
          return;
        }
        toast.success(
          result.refunded
            ? "Session canceled — your credits were returned."
            : "Session canceled. Credits are not refunded within 24 hours of the session.",
        );
        await Promise.all([bootstrapCoaches(), reloadHistory(), onBooked()]);
      } finally {
        onBusyChange(false);
      }
    },
    [busy, bootstrapCoaches, onBooked, onBusyChange, reloadHistory],
  );

  const hasPreviousCoaches = previousCoaches.length > 0;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div>
        <p className="text-sm font-medium">Book a 1:1 session</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{helperText}</p>
      </div>

      {bookable ? (
        <>
          {loadingCoaches ? (
            <p className="text-xs text-muted-foreground">Loading coaches…</p>
          ) : roster.length === 0 && previousCoaches.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No coaches are available to book right now.
            </p>
          ) : step === "chooseCoach" ? (
            <CoachSelectionStep
              roster={roster}
              previousCoaches={previousCoaches}
              previousAvailability={previousAvailability}
              showFullRoster={showFullRoster}
              hasPreviousCoaches={hasPreviousCoaches}
              busy={busy}
              onViewProfile={handleViewProfile}
              onSelectCoach={handleSelectCoach}
              onChooseAnotherCoach={() => setShowFullRoster(true)}
              onMatchMe={handleMatchMe}
            />
          ) : (
            <SlotSelectionStep
              bookingMode={bookingMode}
              selectedCoach={selectedCoach}
              selectedDay={selectedDay}
              selectedSlot={selectedSlot}
              slots={slots}
              loadingSlots={loadingSlots}
              busy={busy}
              bookingError={bookingError}
              onBack={goToCoachStep}
              onSelectDay={(day) => {
                setSelectedDay(day);
                setSelectedSlot(null);
                setBookingError(null);
              }}
              onSelectSlot={(slot) => {
                setSelectedSlot(slot);
                setBookingError(null);
              }}
              onConfirm={() => void handleConfirm()}
              onErrorAction={handleBookingErrorAction}
            />
          )}

          <CoachProfileSheet
            coach={profileCoach}
            open={profileOpen}
            busy={busy}
            onOpenChange={setProfileOpen}
            onBook={handleProfileBook}
          />
        </>
      ) : locked ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full justify-between"
          onClick={onPremiumRequired}
        >
          <span>Book a 1:1 session</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Premium
          </span>
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {history.length > 0 ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs font-medium text-muted-foreground">Your 1:1 sessions</p>
          <ul className="space-y-2">
            {history.map((row) => (
              <li
                key={row.id}
                className={cn("flex flex-col gap-1 rounded-md bg-muted/40 px-2.5 py-2 text-xs")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {row.scheduledAt
                      ? format(new Date(row.scheduledAt), "MMM d · HH:mm")
                      : "Unscheduled"}
                    {row.durationMinutes ? ` · ${row.durationMinutes}m` : null}
                    {row.specialistName ? ` · ${row.specialistName}` : null}
                  </span>
                  <Badge variant="secondary" className="font-normal">
                    {formatCoachBookingStatusLabel(row.status)}
                  </Badge>
                </div>
                {row.meetLink ? (
                  <a
                    href={row.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Join Meet
                  </a>
                ) : null}
                {row.coachSessionNotes?.trim() ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    <span className="font-medium text-foreground">Coach notes: </span>
                    {row.coachSessionNotes.trim()}
                  </p>
                ) : null}
                {isUpcomingConfirmed(row) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 self-start px-2 text-xs text-muted-foreground hover:text-destructive"
                    disabled={busy}
                    onClick={() => void handleCancel(row.id)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
