import { useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createCoachBooking } from "@/lib/coach/coachBookingApi";
import {
  canAccessHumanCoachingCard,
  canBookGroupCoachSession,
  canBookHumanCoach,
} from "@/lib/coach/coachBookingEntitlements";
import { SETTINGS_TAB } from "@/lib/settings/settingsTabStub";
import { settingsPath } from "@/lib/settings/navigation";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import { useUserProfile } from "@/lib/userProfile";
import { cn } from "@/lib/utils";

const EXTERNAL_COACH_URL =
  import.meta.env.VITE_COACH_BOOKING_URL ?? "https://uncloud360.ai/coaching";

export default function BookCoachCard() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const tier = resolveCurrentTier(
    !!profile?.subscribed,
    profile?.tier,
    profile?.accountType,
    profile?.enterpriseTier,
  );
  const canGroup = canBookGroupCoachSession(tier);
  const canOneOnOne = canBookHumanCoach(tier);
  const [oneOnOneBusy, setOneOnOneBusy] = useState(false);

  if (!canAccessHumanCoachingCard(tier)) return null;

  const goToSubscription = () => navigate(settingsPath(SETTINGS_TAB.SUBSCRIPTION));

  const handleGroupSession = () => {
    if (!canGroup) {
      goToSubscription();
      return;
    }
    toast.success("Your group session request has been sent. We'll email you the details.");
  };

  const handleOneOnOneSession = async () => {
    if (!canOneOnOne) {
      goToSubscription();
      return;
    }

    setOneOnOneBusy(true);
    try {
      const booking = await createCoachBooking({
        externalCalendarUrl: EXTERNAL_COACH_URL,
      });
      toast.success(
        booking.kotaRead
          ? "Booking created — Kota's Read was sent to your coach team."
          : "Booking created — we'll email you a link to schedule your session.",
      );
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error && err.message.includes("Premium membership")
          ? err.message
          : "Could not create booking. Try again later.",
      );
    } finally {
      setOneOnOneBusy(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Human coaching
        </CardTitle>
        <CardDescription className="text-xs">
          Group sessions come with Pro. 1:1 sessions come with Premium.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 text-xs">
        <Button
          type="button"
          variant={canGroup ? "outline" : "cta"}
          size="sm"
          className="h-9 w-full justify-between px-3 text-xs"
          onClick={handleGroupSession}
        >
          <span>Book a group session</span>
          {!canGroup ? <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        </Button>

        <Button
          type="button"
          variant={canOneOnOne ? "cta" : "outline"}
          size="sm"
          className={cn(
            "h-9 w-full justify-between px-3 text-xs",
            canOneOnOne && "shadow-sm",
          )}
          disabled={oneOnOneBusy}
          onClick={() => void handleOneOnOneSession()}
        >
          <span>{oneOnOneBusy ? "Preparing…" : "Book a 1:1 session"}</span>
          {!canOneOnOne ? <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        </Button>
      </CardContent>
    </Card>
  );
}
