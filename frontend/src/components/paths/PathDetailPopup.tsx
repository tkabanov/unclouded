import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Info, Star, X } from "lucide-react";
import LockedFeatureUpgradeDialog from "@/components/subscription/LockedFeatureUpgradeDialog";
import { useLockedFeatureUpsell } from "@/hooks/useLockedFeatureUpsell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { useAuth } from "@/hooks/useAuth";
import {
  enrollInPath,
  PathEnrollmentPurchaseRequiredError,
  PathEnrollmentUpgradeRequiredError,
  unenrollFromPath,
  type PathEnrollmentListItem,
} from "@/lib/paths/pathsEnrollmentApi";
import { useOptionalPathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import { fetchPathSessionsByKey, type PathCatalogEntry } from "@/lib/paths/pathsCatalogApi";
import { toModuleProfileInput } from "@/lib/paths/pathModuleProfileInput";
import { resolvePathModuleGate } from "@/lib/paths/pathModulePrerequisites";
import {
  isSuccessPlanPath,
  resolveSuccessPlanAccess,
} from "@/lib/paths/successPlanAccess";
import { TIER, TIER_LABELS, TIER_ORDER, type TierSlug } from "@/lib/enums/tier";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { useUserProfile } from "@/lib/userProfile";
import {
  loadSubscriptionOverview,
  startSuccessPlanAddonCheckout,
} from "@/lib/subscription/subscriptionApi";
import {
  PATHS_PATH_DETAIL_DISCLAIMER_TEXT,
  PATHS_ROUTE,
  SESSION_SEARCH_PARAM,
} from "@/lib/paths/routes";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { toast } from "sonner";

import * as DialogPrimitive from "@radix-ui/react-dialog";

export interface PathDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment?: PathEnrollmentListItem | null;
  catalogPath?: PathCatalogEntry | null;
  onEnrollmentsChanged?: () => Promise<void>;
}

function tierPriority(tier: TierSlug): number {
  return TIER_ORDER.indexOf(tier);
}

function isActiveEnrollment(enrollment: PathEnrollmentListItem | null): boolean {
  if (!enrollment) return false;
  return (
    enrollment.status === PATH_ENROLLMENT_STATUS.ACTIVE ||
    enrollment.status === PATH_ENROLLMENT_STATUS.PAUSED
  );
}

export default function PathDetailPopup({
  open,
  onOpenChange,
  enrollment = null,
  catalogPath = null,
  onEnrollmentsChanged,
}: PathDetailPopupProps) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const enrollmentStore = useOptionalPathsEnrollmentStore();
  const storeEnrollments = enrollmentStore?.enrollments ?? [];

  const matchedEnrollment = useMemo(() => {
    if (enrollment) return enrollment;
    const slug = catalogPath?.slug;
    if (!slug) return null;
    return (
      storeEnrollments.find(
        (row) =>
          row.pathSlug === slug &&
          (row.status === PATH_ENROLLMENT_STATUS.ACTIVE ||
            row.status === PATH_ENROLLMENT_STATUS.PAUSED ||
            row.status === PATH_ENROLLMENT_STATUS.COMPLETED),
      ) ?? null
    );
  }, [enrollment, catalogPath?.slug, storeEnrollments]);

  const refreshEnrollments = async () => {
    if (onEnrollmentsChanged) {
      await onEnrollmentsChanged();
      return;
    }
    await enrollmentStore?.refresh();
  };
  const [busy, setBusy] = useState(false);
  const [stepsText, setStepsText] = useState("");
  const [stepsLoading, setStepsLoading] = useState(false);
  const [lastStepText, setLastStepText] = useState<string | null>(null);

  const dismiss = () => onOpenChange(false);

  const pathSlug = matchedEnrollment?.pathSlug ?? catalogPath?.slug;
  const pathTier = matchedEnrollment?.tier ?? catalogPath?.tier ?? TIER.FREE;
  const pathName = matchedEnrollment?.pathName ?? catalogPath?.name ?? "Path";
  const pillarLabel = matchedEnrollment?.pillarLabel ?? catalogPath?.pillar ?? "";
  const subMode = matchedEnrollment?.subMode ?? catalogPath?.subMode;
  const progressPercent = matchedEnrollment?.progressPercent ?? 0;
  const userTier = useEffectiveTier().tier;
  const moduleGate = useMemo(
    () =>
      resolvePathModuleGate(
        toModuleProfileInput(profile),
        catalogPath?.triggerSignals,
      ),
    [profile, catalogPath?.triggerSignals],
  );
  const isSuccessPlan = isSuccessPlanPath({
    subMode,
    triggerSignals: catalogPath?.triggerSignals,
  });
  const hasHrAssignment = matchedEnrollment?.source === "hr_assign";
  const [hasSuccessPlanAddon, setHasSuccessPlanAddon] = useState(false);
  const [addonLoading, setAddonLoading] = useState(false);

  useEffect(() => {
    if (!open || !isSuccessPlan || hasHrAssignment) {
      setHasSuccessPlanAddon(false);
      setAddonLoading(false);
      return;
    }
    let cancelled = false;
    setAddonLoading(true);
    void loadSubscriptionOverview()
      .then((overview) => {
        if (!cancelled) setHasSuccessPlanAddon(overview.successPlanAddon.active);
      })
      .catch(() => {
        if (!cancelled) setHasSuccessPlanAddon(false);
      })
      .finally(() => {
        if (!cancelled) setAddonLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isSuccessPlan, hasHrAssignment]);

  const successPlanAccess = isSuccessPlan
    ? resolveSuccessPlanAccess({
        userTier,
        hasSuccessPlanAddon,
        hasHrAssignment,
      })
    : null;
  const needsUpgrade = isSuccessPlan
    ? Boolean(successPlanAccess && !successPlanAccess.allowed && successPlanAccess.reason === "upgrade_required")
    : tierPriority(pathTier) > tierPriority(userTier);
  const needsPurchase = Boolean(
    isSuccessPlan &&
      successPlanAccess &&
      !successPlanAccess.allowed &&
      successPlanAccess.reason === "purchase_required",
  );
  const lockedPathFeature = isSuccessPlan
    ? "successPlan"
    : pathTier === TIER.PREMIUM
      ? "premiumPath"
      : "proPath";
  const pathUpsell = useLockedFeatureUpsell(userTier);
  const enrolled = isActiveEnrollment(matchedEnrollment);
  const accessBlocked =
    (isSuccessPlan && successPlanAccess && !successPlanAccess.allowed) ||
    (!isSuccessPlan && needsUpgrade);
  const showEnroll =
    !enrolled &&
    !accessBlocked &&
    !addonLoading &&
    !moduleGate?.blocked &&
    Boolean(pathSlug);
  const showUnenroll = enrolled && Boolean(matchedEnrollment?.enrollmentId);
  const showUpgrade = needsUpgrade;
  const showPurchase = needsPurchase && !enrolled;
  const continueSessionId = matchedEnrollment?.currentSessionId;
  // Stale enrollments after downgrade stay visible (progress read-only) but
  // Continue must not bypass the tier gate — PL-GATE-002 / PL-DOWN-001.
  // HR-assigned Success Plans remain accessible for Free seats (OVR-038).
  const showContinue =
    enrolled &&
    !accessBlocked &&
    Boolean(continueSessionId) &&
    matchedEnrollment?.status !== PATH_ENROLLMENT_STATUS.COMPLETED;

  useEffect(() => {
    if (!open || !pathSlug) {
      setStepsText("");
      setStepsLoading(false);
      setLastStepText(null);
      return;
    }

    let cancelled = false;
    setStepsLoading(true);
    fetchPathSessionsByKey(pathSlug)
      .then((sessions) => {
        if (cancelled) return;
        setStepsText(
          sessions
            .map((session) => `Step ${session.index}: ${session.title}`)
            .join(" "),
        );

        const completedCount = matchedEnrollment
          ? Math.round(
              (matchedEnrollment.progressPercent / 100) * Math.max(sessions.length, 1),
            )
          : 0;
        if (completedCount <= 0) {
          setLastStepText(null);
          return;
        }

        const session = sessions[completedCount - 1];
        setLastStepText(
          session ? `Last completed: Step ${session.index}: ${session.title}` : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setStepsText("");
          setLastStepText(null);
        }
      })
      .finally(() => {
        if (!cancelled) setStepsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [matchedEnrollment, open, pathSlug]);

  const stepsDisplayText = stepsLoading
    ? "Loading steps…"
    : stepsText ||
      "Session steps are not available yet. If this path was recently added, try again later.";

  const handleEnroll = async () => {
    if (!user || !pathSlug) return;
    if (needsUpgrade) {
      pathUpsell.promptUpgrade(lockedPathFeature);
      return;
    }
    if (needsPurchase) {
      await handlePurchaseAddon();
      return;
    }
    setBusy(true);
    try {
      await enrollInPath(
        user.id,
        pathSlug,
        profile?.onboardingData ?? null,
        toModuleProfileInput(profile),
      );
      await refreshEnrollments();
      toast.success(`Enrolled in ${pathName}`);
    } catch (err) {
      console.error("Failed to enroll in path", err);
      if (err instanceof PathEnrollmentUpgradeRequiredError) {
        pathUpsell.promptUpgrade(lockedPathFeature);
        return;
      }
      if (err instanceof PathEnrollmentPurchaseRequiredError) {
        await handlePurchaseAddon();
        return;
      }
      toast.error(err instanceof Error ? err.message : "Could not enroll in this path.");
    } finally {
      setBusy(false);
    }
  };

  const handlePurchaseAddon = async () => {
    setBusy(true);
    try {
      const result = await startSuccessPlanAddonCheckout();
      if (result.status === "redirect") {
        window.location.assign(result.url);
        return;
      }
      if (result.status === "pro_required") {
        pathUpsell.promptUpgrade("successPlan");
        return;
      }
      toast.error(result.message);
    } catch (err) {
      console.error("Failed to start Success Plan checkout", err);
      toast.error("Could not start Success Plan checkout.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnenroll = async () => {
    if (!user || !matchedEnrollment?.enrollmentId) return;
    setBusy(true);
    try {
      await unenrollFromPath(
        user.id,
        matchedEnrollment.enrollmentId,
        profile?.onboardingData ?? null,
      );
      await refreshEnrollments();
      dismiss();
    } catch (err) {
      console.error("Failed to unenroll from path", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-style-ref="Popup_dialog_"
          className={cn(
            bubbleStyle("Popup_dialog_"),
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto",
          )}
        >
          <DialogTitle className="sr-only">{pathName}</DialogTitle>
          <header
            className={cn(bubbleStyle("Group_transparent_"), "space-y-3 pr-8")}
          >
            <div
              className={cn(
                bubbleStyle("Group_transparent_"),
                "flex flex-wrap items-center gap-2",
              )}
            >
              {pillarLabel ? (
                <span className={cn(bubbleStyle("Group_badge_"), "text-xs capitalize")}>
                  {pillarLabel}
                </span>
              ) : null}
              {subMode ? (
                <span className={cn(bubbleStyle("Group_badge_"), "text-xs")}>
                  {subMode}
                </span>
              ) : null}
              <span
                className={cn(bubbleStyle("Group_badge_primary_"), "text-xs capitalize")}
              >
                {isSuccessPlan ? "Success Plan" : TIER_LABELS[pathTier]}
              </span>
              {hasHrAssignment ? (
                <span className={cn(bubbleStyle("Group_badge_"), "text-xs")}>
                  Assigned by employer
                </span>
              ) : null}
            </div>

            <h2
              data-style-ref="Text_heading_2_"
              className={cn(
                bubbleStyle("Text_heading_2_"),
                "text-left text-xl font-semibold text-foreground",
              )}
            >
              {pathName}
            </h2>

            <button
              type="button"
              data-style-ref="Button_icon_"
              className={cn(
                bubbleStyle("Button_icon_"),
                "absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md",
              )}
              aria-label="Close"
              onClick={dismiss}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <section
            className={cn(bubbleStyle("Group_transparent_"), "space-y-4")}
          >
            <div className={cn(bubbleStyle("Group_transparent_"), "space-y-2")}>
              <p
                data-style-ref="Text_label_"
                className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}
              >
                Steps
              </p>
              <p
                data-style-ref="Text_body_muted_"
                className={cn(
                  bubbleStyle("Text_body_muted_"),
                  "text-sm leading-relaxed",
                )}
              >
                {stepsDisplayText}
              </p>
            </div>

            <div
              data-style-ref="Group_alert_banner_"
              className={cn(
                bubbleStyle("Group_alert_banner_"),
                "flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3",
              )}
            >
              <Info
                className={cn(bubbleStyle("Icon_muted_"), "mt-0.5 h-4 w-4 shrink-0")}
                aria-hidden
              />
              <p
                data-style-ref="Text_body_muted_"
                className={cn(bubbleStyle("Text_body_muted_"), "text-sm leading-relaxed")}
              >
                {PATHS_PATH_DETAIL_DISCLAIMER_TEXT}
              </p>
            </div>

            {moduleGate?.blocked && !enrolled ? (
              <div
                data-style-ref="Group_alert_banner_"
                className={cn(
                  bubbleStyle("Group_alert_banner_"),
                  "flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3",
                )}
              >
                <Info
                  className={cn(bubbleStyle("Icon_muted_"), "mt-0.5 h-4 w-4 shrink-0")}
                  aria-hidden
                />
                <p
                  data-style-ref="Text_body_muted_"
                  className={cn(bubbleStyle("Text_body_muted_"), "text-sm leading-relaxed")}
                >
                  {moduleGate.headline}
                </p>
              </div>
            ) : null}

            <div
              className={cn(bubbleStyle("Group_transparent_"), "space-y-1.5")}
            >
              <div
                className={cn(bubbleStyle("Group_transparent_"), "w-full")}
              >
                <div>
                  <ProgressBar value={progressPercent} />
                </div>
              </div>
              <p
                className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
              >
                {progressPercent}%
              </p>
              {lastStepText ? (
                <p
                  className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
                >
                  {lastStepText}
                </p>
              ) : null}
            </div>
          </section>

          <DialogFooter
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex flex-col gap-2 sm:flex-row sm:justify-between",
            )}
          >
            {showUpgrade ? (
              <Button
                type="button"
                variant="cta"
                data-style-ref="Button_primary_"
                className={cn(bubbleStyle("Button_primary_"), "gap-1.5")}
                onClick={() => pathUpsell.promptUpgrade(lockedPathFeature)}
              >
                <Star className="h-4 w-4 shrink-0" aria-hidden />
                Upgrade Plan
              </Button>
            ) : null}

            {showPurchase ? (
              <Button
                type="button"
                variant="cta"
                data-style-ref="Button_primary_"
                className={cn(bubbleStyle("Button_primary_"), "gap-1.5")}
                disabled={busy}
                onClick={() => void handlePurchaseAddon()}
              >
                Purchase Success Plan Add-on
              </Button>
            ) : null}

            {moduleGate?.blocked && !enrolled ? (
              <Button
                asChild
                type="button"
                variant="cta"
                data-style-ref="Button_primary_"
                className={cn(bubbleStyle("Button_primary_"))}
              >
                <Link to={moduleGate.ctaHref} onClick={dismiss}>
                  {moduleGate.ctaLabel}
                </Link>
              </Button>
            ) : null}

            {showContinue && continueSessionId ? (
              <Button
                asChild
                type="button"
                variant="cta"
                data-style-ref="Button_primary_"
                className={cn(bubbleStyle("Button_primary_"))}
              >
                <Link
                  to={`${PATHS_ROUTE}?${SESSION_SEARCH_PARAM}=${encodeURIComponent(continueSessionId)}`}
                  onClick={dismiss}
                >
                  Continue Session
                </Link>
              </Button>
            ) : null}

            {showUnenroll ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                data-style-ref="Button_secondary_"
                className={cn(bubbleStyle("Button_secondary_"))}
                onClick={() => void handleUnenroll()}
              >
                Unenroll
              </Button>
            ) : null}

            {showEnroll ? (
              <Button
                type="button"
                variant="cta"
                disabled={busy}
                data-style-ref="Button_primary_"
                className={cn(bubbleStyle("Button_primary_"))}
                onClick={() => void handleEnroll()}
              >
                Enroll in Path
              </Button>
            ) : null}
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>

      <LockedFeatureUpgradeDialog
        open={pathUpsell.openFeature === lockedPathFeature}
        feature={lockedPathFeature}
        currentTier={userTier}
        onClose={pathUpsell.closeUpsell}
      />
    </Dialog>
  );
}
