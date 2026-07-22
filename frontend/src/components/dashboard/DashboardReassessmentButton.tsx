import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { SETTINGS_TAB } from "@/lib/settings/settingsTabStub";
import { settingsPath } from "@/lib/settings/navigation";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import {
  reassessmentCtaButtonLabel,
  resolveReassessmentCtaState,
} from "@/lib/reassessment/reassessmentEntitlements";
import { useUserProfile } from "@/lib/userProfile";
import { cn } from "@/lib/utils";

export default function DashboardReassessmentButton() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const tier = resolveCurrentTier(!!profile?.subscribed, profile?.tier);
  const dateCtx = {
    tier,
    lastAssessmentDate: profile?.lastAssessmentDate ?? null,
    nextReassessmentDate: profile?.nextReassessmentDate ?? null,
    onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
    canReassessOnDemand: profile?.canReassessOnDemand,
    reassessmentCompletedAt: profile?.reassessmentCompletedAt ?? null,
  };
  const cta = resolveReassessmentCtaState(dateCtx);
  const label = reassessmentCtaButtonLabel(cta);

  if (cta.kind === "upgrade") {
    return (
      <Button
        type="button"
        variant="cta"
        className="h-11 w-full text-sm font-semibold"
        onClick={() => navigate(settingsPath(SETTINGS_TAB.SUBSCRIPTION))}
      >
        {label}
      </Button>
    );
  }

  if (cta.kind === "available") {
    return (
      <Button
        type="button"
        variant="cta"
        className="h-11 w-full text-sm font-semibold"
        onClick={() => navigate("/onboarding?reassessment=1")}
      >
        {label}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled
      className={cn(
        "h-11 w-full cursor-not-allowed text-sm font-medium text-muted-foreground",
      )}
    >
      {label}
    </Button>
  );
}
