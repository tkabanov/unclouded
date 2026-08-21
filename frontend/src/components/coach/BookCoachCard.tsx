import { useCallback, useEffect, useState } from "react";
import { Crown, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OneOnOneBookingPanel from "@/components/coach/OneOnOneBookingPanel";
import LockedFeatureUpgradeDialog from "@/components/subscription/LockedFeatureUpgradeDialog";
import { useLockedFeatureUpsell } from "@/hooks/useLockedFeatureUpsell";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { useSubscriptionOverview } from "@/hooks/useSubscriptionOverview";
import { useUserProfile } from "@/lib/userProfile";
import {
  loadGroupSessionStatus,
  requestGroupSessionBooking,
} from "@/lib/coach/coachBookingApi";
import {
  canBookGroupCoachSession,
  resolveOneOnOneButtonState,
  shouldShowHumanCoachingCard,
} from "@/lib/coach/coachBookingEntitlements";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";
import { resolveCreditsExpireAt } from "@/lib/subscription/subscriptionState";

export default function BookCoachCard() {
  const { overview, record, loading, refresh } = useSubscriptionOverview();
  const { tier } = useEffectiveTier();
  const { profile } = useUserProfile();
  const { openFeature, promptUpgrade, closeUpsell, isEnterprise } = useLockedFeatureUpsell(
    tier,
    profile?.accountType,
  );

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

  if (loading && !overview) return null;
  if (!shouldShowHumanCoachingCard(tier)) return null;

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

        <CardContent className="space-y-3 text-sm">
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

          <OneOnOneBookingPanel
            bookable={oneOnOne.kind === "bookable"}
            locked={oneOnOne.kind === "locked"}
            busy={oneOnOneBusy}
            onBusyChange={setOneOnOneBusy}
            onBooked={refresh}
            onPremiumRequired={() => promptUpgrade("oneOnOneSession")}
            helperText={oneOnOne.helper}
          />
        </CardContent>
      </Card>

      {openFeature ? (
        <LockedFeatureUpgradeDialog
          open
          feature={openFeature}
          currentTier={tier}
          isEnterprise={isEnterprise}
          onClose={closeUpsell}
        />
      ) : null}
    </>
  );
}
