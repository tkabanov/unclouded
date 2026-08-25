import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  cancelOneOnOneBooking,
  confirmOneOnOneBooking,
  fetchMyCoachBookings,
  formatCoachBookingStatusLabel,
  listBookableOneOnOneSlots,
  type BookableOneOnOneSlot,
  type CoachBookingRow,
} from "@/lib/coach/coachBookingApi";
import { cn } from "@/lib/utils";

const SLOT_LOOKAHEAD_DAYS = 14;

function isUpcomingConfirmed(row: CoachBookingRow): boolean {
  if (row.status !== "confirmed" || !row.scheduledAt) return false;
  return new Date(row.scheduledAt).getTime() > Date.now();
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
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [slots, setSlots] = useState<BookableOneOnOneSlot[]>([]);
  const [history, setHistory] = useState<CoachBookingRow[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookableOneOnOneSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const rangeFrom = useMemo(() => startOfDay(new Date()), []);
  const rangeTo = useMemo(
    () => endOfDay(addDays(new Date(), SLOT_LOOKAHEAD_DAYS)),
    [],
  );

  const reloadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const next = await listBookableOneOnOneSlots(rangeFrom, rangeTo);
      setSlots(next);
    } catch {
      toast.error("Couldn't load available times.");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [rangeFrom, rangeTo]);

  const reloadHistory = useCallback(async () => {
    try {
      const rows = await fetchMyCoachBookings(10);
      setHistory(rows);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void reloadSlots();
    void reloadHistory();
  }, [reloadHistory, reloadSlots]);

  const daysWithSlots = useMemo(() => {
    const set = new Set<string>();
    for (const slot of slots) {
      set.add(format(new Date(slot.slotStart), "yyyy-MM-dd"));
    }
    return set;
  }, [slots]);

  const slotsForDay = useMemo(() => {
    const from = startOfDay(selectedDay).getTime();
    const to = endOfDay(selectedDay).getTime();
    return slots.filter((slot) => {
      const t = new Date(slot.slotStart).getTime();
      return t >= from && t <= to;
    });
  }, [selectedDay, slots]);

  const handleConfirm = useCallback(async () => {
    if (!bookable) {
      onPremiumRequired();
      return;
    }
    if (!selectedSlot || busy) return;

    onBusyChange(true);
    try {
      const result = await confirmOneOnOneBooking({
        slotStart: selectedSlot.slotStart,
        durationMinutes: selectedSlot.durationMinutes,
      });

      if (result.status === "blocked") {
        if (result.code === "premium_required") {
          onPremiumRequired();
        } else {
          toast.error(result.message);
        }
        await reloadSlots();
        await onBooked();
        return;
      }

      toast.success(
        result.kotaRead
          ? "Session booked — confirmation is on the way, and Kota's Read was prepared for your coach."
          : "Session booked — you'll get a confirmation email with session details.",
      );
      setSelectedSlot(null);
      await Promise.all([reloadSlots(), reloadHistory(), onBooked()]);
    } finally {
      onBusyChange(false);
    }
  }, [
    bookable,
    busy,
    onBooked,
    onBusyChange,
    onPremiumRequired,
    reloadHistory,
    reloadSlots,
    selectedSlot,
  ]);

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
        await Promise.all([reloadSlots(), reloadHistory(), onBooked()]);
      } finally {
        onBusyChange(false);
      }
    },
    [busy, onBooked, onBusyChange, reloadHistory, reloadSlots],
  );

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div>
        <p className="text-sm font-medium">Book a 1:1 session</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{helperText}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Times are shown without coach names. An available specialist is assigned after you
          confirm.
        </p>
      </div>

      {bookable ? (
        <>
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={(day) => {
              if (day) {
                setSelectedDay(startOfDay(day));
                setSelectedSlot(null);
              }
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
              No open times on this day. Pick another highlighted date.
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
                    onClick={() => setSelectedSlot(slot)}
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
            disabled={busy || !selectedSlot}
            onClick={() => void handleConfirm()}
          >
            {busy ? "Booking…" : "Confirm session"}
          </Button>
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
                className={cn(
                  "flex flex-col gap-1 rounded-md bg-muted/40 px-2.5 py-2 text-xs",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {row.scheduledAt
                      ? format(new Date(row.scheduledAt), "MMM d · HH:mm")
                      : "Unscheduled"}
                    {row.durationMinutes ? ` · ${row.durationMinutes}m` : null}
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
                {row.status === "completed" && row.coachSessionNotes?.trim() ? (
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
