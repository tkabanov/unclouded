import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Info, Star, X } from "lucide-react";
import { settingsPath } from "@/lib/settings/navigation";
import { SETTINGS_TAB } from "@/lib/settings/settingsTabStub";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { useAuth } from "@/hooks/useAuth";
import {
  enrollInPath,
  unenrollFromPath,
  type PathEnrollmentListItem,
} from "@/lib/paths/pathsEnrollmentApi";
import { useOptionalPathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import { fetchPathSessionsByKey, type PathCatalogEntry } from "@/lib/paths/pathsCatalogApi";
import { toModuleProfileInput } from "@/lib/paths/pathModuleProfileInput";
import { resolvePathModuleGate } from "@/lib/paths/pathModulePrerequisites";
import { TIER, TIER_LABELS, TIER_ORDER, type TierSlug } from "@/lib/enums/tier";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { useUserProfile } from "@/lib/userProfile";
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

function isTierSlug(value: string): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

function resolveUserTier(
  subscribed: boolean,
  profileTier: string | null | undefined,
  onboardingData: Record<string, unknown> | null | undefined,
): TierSlug {
  if (typeof profileTier === "string" && isTierSlug(profileTier)) return profileTier;
  const raw = onboardingData?.tier;
  if (typeof raw === "string" && isTierSlug(raw)) return raw;
  return subscribed ? TIER.PRO : TIER.FREE;
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
  const navigate = useNavigate();
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
  const [lastStepText, setLastStepText] = useState<string | null>(null);

  const dismiss = () => onOpenChange(false);

  const pathSlug = matchedEnrollment?.pathSlug ?? catalogPath?.slug;
  const pathTier = matchedEnrollment?.tier ?? catalogPath?.tier ?? TIER.FREE;
  const pathName = matchedEnrollment?.pathName ?? catalogPath?.name ?? "Path";
  const pillarLabel = matchedEnrollment?.pillarLabel ?? catalogPath?.pillar ?? "";
  const subMode = matchedEnrollment?.subMode ?? catalogPath?.subMode;
  const progressPercent = matchedEnrollment?.progressPercent ?? 0;
  const userTier = resolveUserTier(
    profile?.subscribed ?? false,
    profile?.tier ?? null,
    profile?.onboardingData ?? null,
  );
  const moduleGate = useMemo(
    () =>
      resolvePathModuleGate(
        toModuleProfileInput(profile),
        catalogPath?.triggerSignals,
      ),
    [profile, catalogPath?.triggerSignals],
  );
  const needsUpgrade = tierPriority(pathTier) > tierPriority(userTier);
  const enrolled = isActiveEnrollment(matchedEnrollment);
  const showEnroll = !enrolled && !needsUpgrade && !moduleGate?.blocked && Boolean(pathSlug);
  const showUnenroll = enrolled && Boolean(matchedEnrollment?.enrollmentId);
  const showUpgrade = needsUpgrade;
  const continueSessionId = matchedEnrollment?.currentSessionId;
  const showContinue =
    enrolled &&
    Boolean(continueSessionId) &&
    matchedEnrollment?.status !== PATH_ENROLLMENT_STATUS.COMPLETED;

  useEffect(() => {
    if (!open || !pathSlug) {
      setStepsText("");
      setLastStepText(null);
      return;
    }

    let cancelled = false;
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
      });

    return () => {
      cancelled = true;
    };
  }, [matchedEnrollment, open, pathSlug]);

  const handleEnroll = async () => {
    if (!user || !pathSlug) return;
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
      toast.error(err instanceof Error ? err.message : "Could not enroll in this path.");
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
                {TIER_LABELS[pathTier]}
              </span>
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
                {stepsText || "Loading steps…"}
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
                onClick={() => navigate(settingsPath(SETTINGS_TAB.SUBSCRIPTION))}
              >
                <Star className="h-4 w-4 shrink-0" aria-hidden />
                Upgrade Plan
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
    </Dialog>
  );
}
