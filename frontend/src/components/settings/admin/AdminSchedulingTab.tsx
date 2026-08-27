import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminSpecialistRecord } from "@/lib/settings/admin/adminSpecialistsApi";
import {
  availabilityToForm,
  classifyDaySlots,
  deleteSpecialistAvailability,
  emptyAvailabilityForm,
  fetchActiveSpecialistsForScheduling,
  fetchSpecialistAvailability,
  fetchSpecialistBookings,
  listBookableOneOnOneSlots,
  upsertSpecialistAvailability,
  type AdminAvailabilityFormState,
  type AdminAvailabilityRecord,
  type AdminSpecialistBookingRecord,
  type BookableOneOnOneSlot,
} from "@/lib/settings/admin/adminSpecialistAvailabilityApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatTimeRange(start: Date, end: Date): string {
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

export default function AdminSchedulingTab() {
  const [specialists, setSpecialists] = useState<AdminSpecialistRecord[]>([]);
  const [specialistId, setSpecialistId] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [availability, setAvailability] = useState<AdminAvailabilityRecord[]>([]);
  const [bookings, setBookings] = useState<AdminSpecialistBookingRecord[]>([]);
  const [memberSlots, setMemberSlots] = useState<BookableOneOnOneSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminAvailabilityRecord | null>(null);
  const [form, setForm] = useState<AdminAvailabilityFormState>(emptyAvailabilityForm());

  const rangeFrom = useMemo(() => startOfDay(addDays(selectedDay, -1)), [selectedDay]);
  const rangeTo = useMemo(() => endOfDay(addDays(selectedDay, 1)), [selectedDay]);

  const daySlots = useMemo(
    () => classifyDaySlots({ day: selectedDay, availability, bookings }),
    [availability, bookings, selectedDay],
  );

  const dayWindows = useMemo(
    () =>
      availability.filter((row) => {
        const start = new Date(row.startsAt);
        const end = new Date(row.endsAt);
        return end > startOfDay(selectedDay) && start < endOfDay(selectedDay);
      }),
    [availability, selectedDay],
  );

  const memberSlotsForDay = useMemo(() => {
    const from = startOfDay(selectedDay).getTime();
    const to = endOfDay(selectedDay).getTime();
    return memberSlots.filter((slot) => {
      const t = new Date(slot.slotStart).getTime();
      return t >= from && t <= to;
    });
  }, [memberSlots, selectedDay]);

  const reloadSpecialists = useCallback(async () => {
    const rows = await fetchActiveSpecialistsForScheduling();
    setSpecialists(rows);
    setSpecialistId((prev) => {
      if (prev && rows.some((row) => row.specialistId === prev)) return prev;
      return rows[0]?.specialistId ?? "";
    });
  }, []);

  const reloadSchedule = useCallback(async () => {
    if (!specialistId) {
      setAvailability([]);
      setBookings([]);
      return;
    }
    const [avail, booked] = await Promise.all([
      fetchSpecialistAvailability(specialistId, rangeFrom, rangeTo),
      fetchSpecialistBookings(specialistId, rangeFrom, rangeTo),
    ]);
    setAvailability(avail);
    setBookings(booked);
  }, [rangeFrom, rangeTo, specialistId]);

  const reloadMemberPreview = useCallback(async () => {
    if (!specialistId) {
      setMemberSlots([]);
      return;
    }
    const slots = await listBookableOneOnOneSlots(rangeFrom, rangeTo, specialistId);
    setMemberSlots(slots);
  }, [rangeFrom, rangeTo, specialistId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reloadSpecialists()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load specialists.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadSpecialists]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([reloadSchedule(), reloadMemberPreview()]).catch(() => {
      if (!cancelled) toast.error("Couldn't load schedule.");
    });
    return () => {
      cancelled = true;
    };
  }, [reloadMemberPreview, reloadSchedule]);

  const openCreate = useCallback(() => {
    setEditRow(null);
    setForm(emptyAvailabilityForm(selectedDay));
    setFormOpen(true);
  }, [selectedDay]);

  const openEdit = useCallback((row: AdminAvailabilityRecord) => {
    setEditRow(row);
    setForm(availabilityToForm(row));
    setFormOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!specialistId || busy) return;
    setBusy(true);
    try {
      await upsertSpecialistAvailability({
        availabilityId: editRow?.availabilityId ?? null,
        specialistId,
        form,
      });
      toast.success(editRow ? "Availability updated." : "Availability created.");
      setFormOpen(false);
      await Promise.all([reloadSchedule(), reloadMemberPreview()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't save availability.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [busy, editRow, form, reloadMemberPreview, reloadSchedule, specialistId]);

  const handleDelete = useCallback(
    async (row: AdminAvailabilityRecord) => {
      if (busy) return;
      if (!window.confirm("Delete this availability window?")) return;
      setBusy(true);
      try {
        await deleteSpecialistAvailability(row.availabilityId);
        toast.success("Availability deleted.");
        await Promise.all([reloadSchedule(), reloadMemberPreview()]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't delete availability.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, reloadMemberPreview, reloadSchedule],
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading scheduling…</div>;
  }

  if (specialists.length === 0) {
    return (
      <div className={cn(bubbleStyle("Group_card_muted_"), "p-4 text-sm text-muted-foreground")}>
        Add an active specialist first, then configure availability here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={bubbleStyle("Text_heading_3_")}>Scheduling</h3>
          <p className="text-sm text-muted-foreground">
            Define availability windows per specialist. Times use your local timezone; stored as
            UTC. Standard booking unit is 30 minutes.
          </p>
        </div>
        <Button
          type="button"
          className={bubbleStyle("Button_primary_")}
          onClick={openCreate}
          disabled={!specialistId}
        >
          Add availability
        </Button>
      </div>

      <div className="grid gap-2 max-w-sm">
        <Label htmlFor="scheduling-specialist">Specialist</Label>
        <Select value={specialistId} onValueChange={setSpecialistId}>
          <SelectTrigger id="scheduling-specialist">
            <SelectValue placeholder="Select specialist" />
          </SelectTrigger>
          <SelectContent>
            {specialists.map((specialist) => (
              <SelectItem key={specialist.specialistId} value={specialist.specialistId}>
                {specialist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={(day) => {
            if (day) setSelectedDay(startOfDay(day));
          }}
          className={cn(bubbleStyle("Group_card_muted_"), "rounded-md border")}
        />

        <div className="flex flex-col gap-4">
          <div>
            <h4 className={bubbleStyle("Text_heading_3_")}>
              {format(selectedDay, "EEEE, MMM d")}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Green = available · Amber = booked · Gray = no availability
            </p>
          </div>

          {daySlots.length === 0 ? (
            <div
              className={cn(
                bubbleStyle("Group_card_muted_"),
                "p-4 text-sm text-muted-foreground",
              )}
            >
              No availability on this day (unavailable).
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {daySlots.map((slot) => (
                <Badge
                  key={`${slot.start.toISOString()}-${slot.state}`}
                  variant={slot.state === "booked" ? "secondary" : "default"}
                  className={cn(
                    "px-3 py-1.5 text-sm font-normal",
                    slot.state === "available" && "bg-emerald-600 hover:bg-emerald-600",
                    slot.state === "booked" && "bg-amber-500 text-white hover:bg-amber-500",
                  )}
                >
                  {formatTimeRange(slot.start, slot.end)} · {slot.state}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Availability windows</h4>
            {dayWindows.length === 0 ? (
              <p className="text-sm text-muted-foreground">None for this day.</p>
            ) : (
              dayWindows.map((row) => (
                <div
                  key={row.availabilityId}
                  className={cn(
                    bubbleStyle("Group_card_muted_"),
                    "flex flex-wrap items-center justify-between gap-2 p-3",
                  )}
                >
                  <div className="text-sm">
                    <div>
                      {format(new Date(row.startsAt), "HH:mm")} –{" "}
                      {format(new Date(row.endsAt), "HH:mm")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.durationMinutes}-minute slots
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Edit availability"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Delete availability"
                      onClick={() => void handleDelete(row)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}>
        <div>
          <h4 className={bubbleStyle("Text_heading_3_")}>Preview slots (member view)</h4>
          <p className="text-sm text-muted-foreground">
            Bookable times for the selected coach — same per-coach calendar members see when
            booking.
          </p>
        </div>
        {memberSlotsForDay.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookable slots on this day.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {memberSlotsForDay.map((slot) => (
              <Badge key={slot.slotStart} variant="outline" className="px-3 py-1.5 font-normal">
                {format(new Date(slot.slotStart), "HH:mm")} · {slot.durationMinutes} min
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editRow ? "Edit availability" : "Add availability"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="avail-start">Starts (local)</Label>
              <Input
                id="avail-start"
                type="datetime-local"
                className={bubbleStyle("Input_default_")}
                value={form.startsAtLocal}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startsAtLocal: event.target.value }))
                }
                disabled={busy}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avail-end">Ends (local)</Label>
              <Input
                id="avail-end"
                type="datetime-local"
                className={bubbleStyle("Input_default_")}
                value={form.endsAtLocal}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endsAtLocal: event.target.value }))
                }
                disabled={busy}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avail-duration">Slot duration (minutes)</Label>
              <Input
                id="avail-duration"
                type="number"
                min={5}
                max={180}
                step={5}
                className={bubbleStyle("Input_default_")}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutes: Number(event.target.value) || 30,
                  }))
                }
                disabled={busy}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={bubbleStyle("Button_primary_")}
              onClick={() => void handleSave()}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
