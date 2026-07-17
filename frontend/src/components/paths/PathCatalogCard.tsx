import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { Button } from "@/components/ui/button";
import type { PathCatalogEntry } from "@/lib/paths/pathsCatalogApi";
import type { PathEnrollmentListItem } from "@/lib/paths/pathsEnrollmentApi";
import type { PathModuleGate } from "@/lib/paths/pathModulePrerequisites";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { TIER_LABELS, TIER_ORDER, type TierSlug } from "@/lib/enums/tier";

export interface PathCatalogCardProps {
  path: PathCatalogEntry;
  enrollment?: PathEnrollmentListItem | null;
  userTier: TierSlug;
  moduleGate?: PathModuleGate | null;
  onViewDetails?: (path: PathCatalogEntry) => void;
  className?: string;
}

function tierPriority(tier: TierSlug): number {
  return TIER_ORDER.indexOf(tier);
}

function isEnrolled(enrollment: PathEnrollmentListItem | null | undefined): boolean {
  if (!enrollment) return false;
  return (
    enrollment.status === PATH_ENROLLMENT_STATUS.ACTIVE ||
    enrollment.status === PATH_ENROLLMENT_STATUS.PAUSED ||
    enrollment.status === PATH_ENROLLMENT_STATUS.COMPLETED
  );
}

export default function PathCatalogCard({
  path,
  enrollment,
  userTier,
  moduleGate = null,
  onViewDetails,
  className,
}: PathCatalogCardProps) {
  const enrolled = isEnrolled(enrollment);
  const needsUpgrade = tierPriority(path.tier) > tierPriority(userTier);
  const moduleLocked = Boolean(moduleGate?.blocked) && !enrolled;

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
          {path.pillar ? (
            <span className={cn(bubbleStyle("Group_badge_"), "text-xs capitalize")}>
              {path.pillar}
            </span>
          ) : null}
          {path.subMode ? (
            <span className={cn(bubbleStyle("Group_badge_"), "text-xs")}>{path.subMode}</span>
          ) : null}
          <span className={cn(bubbleStyle("Group_badge_primary_"), "text-xs capitalize")}>
            {TIER_LABELS[path.tier]}
          </span>
          {enrolled ? (
            <span className={cn(bubbleStyle("Group_badge_"), "text-xs capitalize")}>Enrolled</span>
          ) : null}
        </div>
      </header>

      <div className={cn(bubbleStyle("Group_transparent_"), "flex flex-1 flex-col gap-2")}>
        <h3
          className={cn(
            bubbleStyle("Text_heading_3_"),
            "text-base font-semibold text-foreground",
          )}
        >
          {path.name}
        </h3>
        {path.description ? (
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm leading-relaxed line-clamp-3")}>
            {path.description}
          </p>
        ) : null}
        {path.sessionsCount > 0 ? (
          <p className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}>
            {path.sessionsCount} sessions
          </p>
        ) : null}
      </div>

      <footer
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        {enrolled ? (
          <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-1.5")}>
            <CheckCircle2
              className={cn(bubbleStyle("Icon_primary_"), "h-4 w-4 shrink-0")}
              aria-hidden
            />
            <span className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}>
              {enrollment?.progressPercent ?? 0}% complete
            </span>
          </div>
        ) : needsUpgrade ? (
          <span className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}>
            Upgrade required
          </span>
        ) : moduleLocked ? (
          <span className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}>
            Requires Identity Lens
          </span>
        ) : (
          <span className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}>
            Available to enroll
          </span>
        )}

        <Button
          type="button"
          size="sm"
          data-style-ref="Button_accent_"
          className={cn(bubbleStyle("Button_accent_"), "shrink-0")}
          onClick={() => onViewDetails?.(path)}
        >
          {enrolled ? "View Path" : needsUpgrade || moduleLocked ? "View Path" : "Enroll in Path"}
        </Button>
      </footer>
    </article>
  );
}
