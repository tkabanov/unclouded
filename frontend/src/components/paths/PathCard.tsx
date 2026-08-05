import { CheckCircle2, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { Button } from "@/components/ui/button";
import LockedFeatureUpgradeDialog from "@/components/subscription/LockedFeatureUpgradeDialog";
import { useLockedFeatureUpsell } from "@/hooks/useLockedFeatureUpsell";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import type { PathEnrollmentListItem } from "@/lib/dashboard/pathEnrollmentApi";
import { PATH_ENROLLMENT_STATUS, PATH_ENROLLMENT_STATUS_LABELS } from "@/lib/enums/pathEnrollment";
import { TIER, TIER_LABELS } from "@/lib/enums/tier";
import { userCanAccessPathTier } from "@/lib/paths/pathEnrollmentMatching";
import { isSuccessPlanPath, userCanAccessPathClient } from "@/lib/paths/successPlanAccess";
import { PATHS_ROUTE, SESSION_SEARCH_PARAM } from "@/lib/paths/routes";

export interface PathCardProps {
  enrollment: PathEnrollmentListItem;
  onViewDetails?: (enrollment: PathEnrollmentListItem) => void;
  className?: string;
}

function sessionCompletionHref(sessionId: string): string {
  return `${PATHS_ROUTE}?${SESSION_SEARCH_PARAM}=${encodeURIComponent(sessionId)}`;
}

export default function PathCard({
  enrollment,
  onViewDetails,
  className,
}: PathCardProps) {
  const userTier = useEffectiveTier().tier;
  const successPlan = isSuccessPlanPath(enrollment);
  const needsUpgrade = successPlan
    ? !userCanAccessPathClient({
        isSuccessPlan: true,
        userTier,
        pathTier: enrollment.tier,
        // Enrolled via add-on checkout implies entitlement while tier stays paid.
        hasSuccessPlanAddon: enrollment.source === "addon",
        hasHrAssignment: enrollment.source === "hr_assign",
      })
    : !userCanAccessPathTier(userTier, enrollment.tier);
  const lockedPathFeature = successPlan
    ? "successPlan"
    : enrollment.tier === TIER.PREMIUM
      ? "premiumPath"
      : "proPath";
  const pathUpsell = useLockedFeatureUpsell(userTier);
  const statusLabel = PATH_ENROLLMENT_STATUS_LABELS[enrollment.status];
  const canContinue =
    !needsUpgrade &&
    Boolean(enrollment.currentSessionId) &&
    (enrollment.status === PATH_ENROLLMENT_STATUS.ACTIVE ||
      enrollment.status === PATH_ENROLLMENT_STATUS.PAUSED);

  return (
    <article
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex h-full flex-col gap-4 p-5",
        className,
      )}
    >
      <header
        className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-2")}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap items-center gap-2")}
        >
          <span
            className={cn(bubbleStyle("Group_badge_"), "text-xs capitalize")}
          >
            {enrollment.pillarLabel}
          </span>
          {enrollment.subMode ? (
            <span
              className={cn(bubbleStyle("Group_badge_"), "text-xs")}
            >
              {enrollment.subMode}
            </span>
          ) : null}
          <div
            className={cn(bubbleStyle("Group_transparent_"), "inline-flex")}
          >
            <span
              className={cn(bubbleStyle("Group_badge_primary_"), "text-xs capitalize")}
            >
              {successPlan ? "Success Plan" : TIER_LABELS[enrollment.tier]}
            </span>
          </div>
          {enrollment.source === "hr_assign" ? (
            <span className={cn(bubbleStyle("Group_badge_"), "text-xs")}>
              Assigned by employer
            </span>
          ) : null}
        </div>
      </header>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex-1")}
      >
        <h3
          className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
        >
          {enrollment.pathName}
        </h3>
        {enrollment.currentSessionTitle ? (
          <p className={cn(bubbleStyle("Text_small_"), "mt-1 text-xs text-muted-foreground")}>
            Next: {enrollment.currentSessionTitle}
          </p>
        ) : null}
        {needsUpgrade ? (
          <p
            className={cn(bubbleStyle("Text_small_"), "mt-1 text-xs text-muted-foreground")}
            data-testid="path-card-upgrade-required"
          >
            Upgrade required to continue
          </p>
        ) : null}
      </div>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-1")}
      >
        <div className="w-full">
          <ProgressBar value={enrollment.progressPercent} />
        </div>
        <p
          className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
        >
          {enrollment.progressPercent}%
        </p>
      </div>

      <footer
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-1.5")}
        >
          <CheckCircle2
            className={cn(bubbleStyle("Icon_primary_"), "h-4 w-4 shrink-0")}
            aria-hidden
          />
          <span
            className={cn(bubbleStyle("Text_small_"), "text-xs capitalize text-muted-foreground")}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {canContinue && enrollment.currentSessionId ? (
            <Button
              asChild
              type="button"
              size="sm"
              data-style-ref="Button_primary_"
              className={cn(bubbleStyle("Button_primary_"), "shrink-0")}
            >
              <Link to={sessionCompletionHref(enrollment.currentSessionId)}>
                Continue
              </Link>
            </Button>
          ) : null}
          {needsUpgrade &&
          (enrollment.status === PATH_ENROLLMENT_STATUS.ACTIVE ||
            enrollment.status === PATH_ENROLLMENT_STATUS.PAUSED) ? (
            <Button
              type="button"
              size="sm"
              data-style-ref="Button_primary_"
              className={cn(bubbleStyle("Button_primary_"), "shrink-0 gap-1.5")}
              data-testid="path-card-upgrade"
              onClick={() => pathUpsell.promptUpgrade(lockedPathFeature)}
            >
              <Star className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Upgrade Plan
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-style-ref="Button_accent_"
            className={cn(bubbleStyle("Button_accent_"), "shrink-0")}
            onClick={() => onViewDetails?.(enrollment)}
          >
            View Path
          </Button>
        </div>
      </footer>

      <LockedFeatureUpgradeDialog
        open={pathUpsell.openFeature === lockedPathFeature}
        feature={lockedPathFeature}
        currentTier={userTier}
        onClose={pathUpsell.closeUpsell}
      />
    </article>
  );
}
