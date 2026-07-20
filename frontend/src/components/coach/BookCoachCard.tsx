import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCoachBooking } from "@/lib/coach/coachBookingApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

const EXTERNAL_COACH_URL =
  import.meta.env.VITE_COACH_BOOKING_URL ?? "https://uncloud360.ai/coaching";

export default function BookCoachCard() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleBook = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const booking = await createCoachBooking({
        externalCalendarUrl: EXTERNAL_COACH_URL,
      });
      setStatus(
        booking.kotaRead
          ? "Booking created — Kota's Read was sent to your coach team."
          : "Booking created — Kota's Read is generating for your coach team.",
      );
    } catch (err) {
      console.error(err);
      setStatus("Could not create booking. Try again later.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-3 p-5")}>
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" aria-hidden />
        <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}>Book a human coach</h2>
      </div>
      <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
        When you book a 1:1, Kota prepares a private brief for your coach — patterns, open
        threads, and one thing to be careful about.
      </p>
      <Button type="button" onClick={() => void handleBook()} disabled={busy}>
        {busy ? "Preparing…" : "Book a coach"}
      </Button>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
