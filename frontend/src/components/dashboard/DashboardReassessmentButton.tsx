import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  reassessmentCtaButtonLabel,
  resolveReassessmentCtaState,
} from "@/lib/reassessment/reassessmentEntitlements";
import { useUserProfile } from "@/lib/userProfile";
import { cn } from "@/lib/utils";

export default function DashboardReassessmentButton() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { tier } = useEffectiveTier();
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
    return null;
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
