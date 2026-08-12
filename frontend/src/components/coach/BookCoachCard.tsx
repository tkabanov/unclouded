import { useCallback, useEffect, useState } from "react";
import { Crown, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_COACH_BOOKING_URL } from "@/lib/coach/coachBookingConstants";
import LockedFeatureUpgradeDialog from "@/components/subscription/LockedFeatureUpgradeDialog";
import { useLockedFeatureUpsell } from "@/hooks/useLockedFeatureUpsell";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { useSubscriptionOverview } from "@/hooks/useSubscriptionOverview";
import {
  loadGroupSessionStatus,
  requestGroupSessionBooking,
  requestOneOnOneBooking,
} from "@/lib/coach/coachBookingApi";
import {
  canBookGroupCoachSession,
  resolveOneOnOneButtonState,
  shouldShowHumanCoachingCard,
} from "@/lib/coach/coachBookingEntitlements";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";
import { resolveCreditsExpireAt } from "@/lib/subscription/subscriptionState";
import { cn } from "@/lib/utils";

const EXTERNAL_COACH_URL =
  import.meta.env.VITE_COACH_BOOKING_URL ?? DEFAULT_COACH_BOOKING_URL;

export default function BookCoachCard() {
  const { overview, record, loading, refresh } = useSubscriptionOverview();
  const { tier } = useEffectiveTier();
  const { openFeature, promptUpgrade, closeUpsell } = useLockedFeatureUpsell(tier);

  const [groupUsed, setGroupUsed] = useState(false);
  const [groupBusy, setGroupBusy] = useState(false);
  const [oneOnOneBusy, setOneOnOneBusy] = useState(false);

  const canGroup = canBookGroupCoachSession(tier);

  useEffect(() => {
    if (!canGroup) return;
    let cancelled = false;
    loadGroupSessionStatus()
      .then((status) => {
        if (!cancelled) setGroupUsed(status.used);
      })
      .catch(() => {
        // The server enforces the monthly cap regardless of what we render.
      });
    return () => {
      cancelled = true;
    };
  }, [canGroup]);

  const handleGroupSession = useCallback(async () => {
    if (!canGroup) {
      promptUpgrade("groupSession");
      return;
    }

    setGroupBusy(true);
    try {
      const result = await requestGroupSessionBooking();
      if (result.status === "blocked") {
        if (result.code === "monthly_limit_reached") setGroupUsed(true);
        if (result.code === "upgrade_required") {
          promptUpgrade("groupSession");
          return;
        }
        toast.error(result.message);
        return;
      }
      setGroupUsed(true);
      toast.success("Your group session request has been sent. We'll email you the details.");
    } finally {
      setGroupBusy(false);
    }
  }, [canGroup, promptUpgrade]);

  const oneOnOne = resolveOneOnOneButtonState({
    effectiveTier: tier,
    creditBalance: overview?.credits.balance ?? 0,
    creditsExpireAtLabel: formatSubscriptionDate(resolveCreditsExpireAt(record)),
    creditsExpireReason:
      record?.status === "scheduledToDowngrade" ? "downgrade" : "cancel",
    requiredCredits: overview?.credits.requiredPerSession,
  });

  const handleOneOnOneSession = useCallback(async () => {
    if (oneOnOne.kind === "locked") {
      promptUpgrade("oneOnOneSession");
      return;
    }
    if (oneOnOne.kind !== "bookable") return;

    setOneOnOneBusy(true);
    try {
      const result = await requestOneOnOneBooking({
        externalCalendarUrl: EXTERNAL_COACH_URL,
      });

      if (result.status === "blocked") {
        if (result.code === "premium_required") {
          promptUpgrade("oneOnOneSession");
        } else {
          toast.error(result.message);
        }
        await refresh();
        return;
      }

      toast.success(
        result.kotaRead
          ? "Booking created — Kota's Read was sent to your coach team."
          : "Booking created — we'll email you a link to schedule your session.",
      );
      await refresh();
    } finally {
      setOneOnOneBusy(false);
    }
  }, [oneOnOne.kind, promptUpgrade, refresh]);

  if (loading && !overview) return null;
  if (!shouldShowHumanCoachingCard(tier)) return null;

  const oneOnOneDisabled =
    oneOnOneBusy ||
    oneOnOne.kind === "insufficientCredits" ||
    oneOnOne.kind === "creditsUnavailable";

  const oneOnOneLabel =
    oneOnOne.kind === "locked"
      ? "Book a 1:1 session"
      : oneOnOne.label.replace("Session", "session").replace("Sessions", "sessions");

  return (
    <>
      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            Human coaching
          </CardTitle>
          <CardDescription className="text-sm">
            One group session a month comes with Pro. 1:1 sessions come with Premium credits.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <Button
            type="button"
            variant={canGroup && !groupUsed ? "default" : "outline"}
            size="sm"
            className="h-10 w-full justify-between px-3"
            disabled={groupBusy || groupUsed}
            onClick={() => void handleGroupSession()}
          >
            <span>
              {groupUsed
                ? "Group session booked this month"
                : groupBusy
                  ? "Requesting…"
                  : "Book a group session"}
            </span>
            {!canGroup ? <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
          </Button>

          <div className="space-y-1">
            <Button
              type="button"
              variant={oneOnOne.kind === "bookable" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-10 w-full justify-between px-3",
                oneOnOne.kind === "bookable" && "shadow-sm",
              )}
              disabled={oneOnOneDisabled}
              onClick={() => void handleOneOnOneSession()}
            >
              <span>{oneOnOneBusy ? "Preparing…" : oneOnOneLabel}</span>
              {oneOnOne.kind === "locked" || oneOnOne.kind === "bookable" ? (
                <Crown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    oneOnOne.kind === "bookable" ? "text-primary-foreground" : "text-primary",
                  )}
                  aria-hidden
                />
              ) : null}
            </Button>
            <p className="text-[11px] leading-snug text-muted-foreground">{oneOnOne.helper}</p>
          </div>
        </CardContent>
      </Card>

      {openFeature ? (
        <LockedFeatureUpgradeDialog
          open
          feature={openFeature}
          currentTier={tier}
          onClose={closeUpsell}
        />
      ) : null}
    </>
  );
}
