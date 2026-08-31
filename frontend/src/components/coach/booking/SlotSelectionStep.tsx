import { addDays, endOfDay, format, startOfDay } from "date-fns";

import BookingUnavailableAlert from "@/components/coach/booking/BookingUnavailableAlert";
import type { BookingError, BookingMode } from "@/components/coach/booking/types";
import { SLOT_LOOKAHEAD_DAYS } from "@/components/coach/booking/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { BookableCoach, BookableOneOnOneSlot } from "@/lib/coach/coachBookingApi";

type SlotSelectionStepProps = {
  bookingMode: BookingMode;
  selectedCoach: BookableCoach | null;
  selectedDay: Date;
  selectedSlot: BookableOneOnOneSlot | null;
  slots: BookableOneOnOneSlot[];
  loadingSlots: boolean;
  busy: boolean;
  bookingError: BookingError | null;
  onBack: () => void;
  onSelectDay: (day: Date) => void;
  onSelectSlot: (slot: BookableOneOnOneSlot) => void;
  onConfirm: () => void;
  onErrorAction: () => void;
};

export default function SlotSelectionStep({
  bookingMode,
  selectedCoach,
  selectedDay,
  selectedSlot,
  slots,
  loadingSlots,
  busy,
  bookingError,
  onBack,
  onSelectDay,
  onSelectSlot,
  onConfirm,
  onErrorAction,
}: SlotSelectionStepProps) {
  const daysWithSlots = new Set<string>();
  for (const slot of slots) {
    daysWithSlots.add(format(new Date(slot.slotStart), "yyyy-MM-dd"));
  }

  const from = startOfDay(selectedDay).getTime();
  const to = endOfDay(selectedDay).getTime();
  const slotsForDay = slots.filter((slot) => {
    const t = new Date(slot.slotStart).getTime();
    return t >= from && t <= to;
  });

  const canConfirm =
    bookingMode === "autoMatch" ? Boolean(selectedSlot) : Boolean(selectedSlot && selectedCoach);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {bookingMode === "autoMatch" ? (
            <>
              <p className="text-sm font-medium">Pick a time</p>
              <p className="text-[11px] text-muted-foreground">
                We&apos;ll match you with an available coach for this time.
              </p>
            </>
          ) : selectedCoach ? (
            <>
              <p className="text-sm font-medium">{selectedCoach.name}</p>
              <p className="text-[11px] text-muted-foreground">Choose an available time (your local timezone)</p>
            </>
          ) : null}
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={onBack}>
          Back
        </Button>
      </div>

      {bookingError ? (
        <BookingUnavailableAlert error={bookingError} onAction={onErrorAction} />
      ) : null}

      <Calendar
        mode="single"
        selected={selectedDay}
        onSelect={(day) => {
          if (day) onSelectDay(startOfDay(day));
        }}
        disabled={(day) => {
          const key = format(day, "yyyy-MM-dd");
          const beforeToday = startOfDay(day) < startOfDay(new Date());
          const afterWindow = startOfDay(day) > startOfDay(addDays(new Date(), SLOT_LOOKAHEAD_DAYS));
          return beforeToday || afterWindow || !daysWithSlots.has(key);
        }}
        className="rounded-md border"
      />

      {loadingSlots ? (
        <p className="text-xs text-muted-foreground">Loading times…</p>
      ) : slotsForDay.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No open times on this day. Pick another highlighted date or go back to choose another coach.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slotsForDay.map((slot) => {
            const selected = selectedSlot?.slotStart === slot.slotStart;
            return (
              <Button
                key={slot.slotStart}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className="h-8 px-2.5 text-xs"
                disabled={busy}
                onClick={() => onSelectSlot(slot)}
              >
                {format(new Date(slot.slotStart), "HH:mm")} · {slot.durationMinutes}m
              </Button>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={busy || !canConfirm}
        onClick={onConfirm}
      >
        {busy ? "Booking…" : "Confirm session"}
      </Button>
    </div>
  );
}
