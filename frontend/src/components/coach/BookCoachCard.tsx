import { useState } from "react";
import { Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OneOnOneBookingPanel from "@/components/coach/OneOnOneBookingPanel";
import GroupCoachingPanel from "@/components/coach/GroupCoachingPanel";
import LockedFeatureUpgradeDialog from "@/components/subscription/LockedFeatureUpgradeDialog";
import { useLockedFeatureUpsell } from "@/hooks/useLockedFeatureUpsell";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { useSubscriptionOverview } from "@/hooks/useSubscriptionOverview";
import { useUserProfile } from "@/lib/userProfile";
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

  const [oneOnOneBusy, setOneOnOneBusy] = useState(false);

  const canGroup = canBookGroupCoachSession(tier);

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
          <GroupCoachingPanel
            canJoin={canGroup}
            locked={!canGroup}
            onPremiumRequired={() => promptUpgrade("groupSession")}
          />

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
