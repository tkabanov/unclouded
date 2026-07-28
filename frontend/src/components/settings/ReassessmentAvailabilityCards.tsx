import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  canShowPremiumOnDemandLocked,
  canShowReassessNow,
  daysUntilPremiumOnDemand,
  isReassessmentDue,
} from "@/lib/reassessment/reassessmentEntitlements";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import type { UserProfile } from "@/lib/userProfile";

export interface ReassessmentAvailabilityCardsProps {
  profile: UserProfile | null;
  /** Enterprise accounts get no upgrade prompts (Phase 2 §9). */
  isEnterprise: boolean;
}

/**
 * Reassessment availability banners on the subscription screen: due now,
 * available on demand (Premium), or counting down to the Premium 30-day unlock.
 */
export default function ReassessmentAvailabilityCards({
  profile,
  isEnterprise,
}: ReassessmentAvailabilityCardsProps) {
  const dateCtx = {
    tier: resolveCurrentTier(
      !!profile?.subscribed,
      profile?.tier,
      profile?.accountType,
      profile?.enterpriseTier,
    ),
    lastAssessmentDate: profile?.lastAssessmentDate ?? null,
    nextReassessmentDate: profile?.nextReassessmentDate ?? null,
    onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
    canReassessOnDemand: profile?.canReassessOnDemand,
    reassessmentCompletedAt: profile?.reassessmentCompletedAt ?? null,
  };

  const reassessmentDue = isReassessmentDue(dateCtx);
  const showReassessNow = !reassessmentDue && canShowReassessNow(dateCtx);
  const showPremiumOnDemandLocked =
    !reassessmentDue && !showReassessNow && canShowPremiumOnDemandLocked(dateCtx);
  const daysUntilOnDemand = daysUntilPremiumOnDemand(dateCtx);

  if (isEnterprise) return null;

  if (reassessmentDue || showReassessNow) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">
              {reassessmentDue
                ? "Your 90-day reassessment is ready"
                : "Reassess your PuP 360 anytime"}
            </p>
            <p className="text-sm text-muted-foreground">
              {reassessmentDue
                ? "Retake the assessment to see how your scores have changed since your last assessment."
                : "Premium on-demand reassessment is available after day 30."}
            </p>
          </div>
        </div>
        <Button variant="cta" className="shrink-0" asChild>
          <Link to="/onboarding?reassessment=1">
            {reassessmentDue ? "Start reassessment" : "Reassess now"}
          </Link>
        </Button>
      </div>
    );
  }

  if (!showPremiumOnDemandLocked) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">Premium on-demand reassessment</p>
          <p className="text-sm text-muted-foreground">
            Unlocks in {daysUntilOnDemand} day{daysUntilOnDemand === 1 ? "" : "s"} — Premium members
            can reassess on demand 30 days after their last assessment.
          </p>
        </div>
      </div>
      <Button variant="outline" className="shrink-0" disabled>
        Available in {daysUntilOnDemand} day{daysUntilOnDemand === 1 ? "" : "s"}
      </Button>
    </div>
  );
}
