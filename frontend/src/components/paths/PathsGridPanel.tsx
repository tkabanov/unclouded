import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { type PathEnrollmentListItem } from "@/lib/paths/pathsEnrollmentApi";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import { PATH_PAGE_TAB_LABELS, PATH_PAGE_TAB } from "@/lib/enums/pathPageTabs";
import {
  PATHS_ENROLLMENT_RG_BUBBLE_ID,
  PATHS_GRID_EMPTY_TEXT,
  PATHS_GRID_EMPTY_TEXT_BUBBLE_ID,
  PATHS_GRID_RG_BUBBLE_ID,
  PATHS_RECOMMENDED_INDICATOR_BUBBLE_ID,
  PATHS_RECOMMENDED_INDICATOR_DOT_BUBBLE_ID,
  PATHS_RECOMMENDED_SECTION_BUBBLE_ID,
  PATHS_RECOMMENDED_TITLE_BUBBLE_ID,
} from "@/lib/paths/routes";
import { Skeleton } from "@/components/ui/skeleton";
import PathCard from "@/components/paths/PathCard";
import PathsFilterRow, {
  PATHS_TIER_FILTER_ALL,
  matchesTierFilter,
  type PathsTierFilter,
} from "@/components/paths/PathsFilterRow";

export interface PathsGridPanelProps {
  className?: string;
  onViewDetails?: (enrollment: PathEnrollmentListItem) => void;
}

export default function PathsGridPanel({
  className,
  onViewDetails,
}: PathsGridPanelProps) {
  const navigate = useNavigate();
  const { enrollments, loading } = usePathsEnrollmentStore();
  const [selectedTier, setSelectedTier] = useState<PathsTierFilter>(PATHS_TIER_FILTER_ALL);

  const filteredEnrollments = useMemo(
    () => enrollments.filter((row) => matchesTierFilter(row.tier, selectedTier)),
    [enrollments, selectedTier],
  );

  const handleViewDetails = useCallback(
    (enrollment: PathEnrollmentListItem) => {
      if (onViewDetails) {
        onViewDetails(enrollment);
        return;
      }
      navigate(enrollment.pathSlug ? `/paths/${enrollment.pathSlug}` : "/paths");
    },
    [navigate, onViewDetails],
  );

  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <PathsFilterRow selectedTier={selectedTier} onTierChange={setSelectedTier} />

      <div
        data-bubble-id={PATHS_RECOMMENDED_SECTION_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
      >
        <div
          data-bubble-id={PATHS_RECOMMENDED_INDICATOR_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center")}
        >
          <span
            data-bubble-id={PATHS_RECOMMENDED_INDICATOR_DOT_BUBBLE_ID}
            className="h-2 w-2 rounded-full bg-primary"
            aria-hidden
          />
        </div>
        <h2
          data-bubble-id={PATHS_RECOMMENDED_TITLE_BUBBLE_ID}
          className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
        >
          {PATH_PAGE_TAB_LABELS[PATH_PAGE_TAB.MY_PATHS]}
        </h2>
      </div>

      <div
        data-bubble-id={PATHS_ENROLLMENT_RG_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "w-full")}
      >
        <div
          data-bubble-id={PATHS_GRID_RG_BUBBLE_ID}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {loading ? (
            <>
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </>
          ) : filteredEnrollments.length === 0 ? (
            enrollments.length === 0 ? (
              <p
                data-bubble-id={PATHS_GRID_EMPTY_TEXT_BUBBLE_ID}
                className={cn(bubbleStyle("Text_body_"), "col-span-full text-sm")}
              >
                {PATHS_GRID_EMPTY_TEXT}
              </p>
            ) : (
              <p className={cn(bubbleStyle("Text_body_muted_"), "col-span-full text-sm")}>
                No paths match the selected tier.
              </p>
            )
          ) : (
            filteredEnrollments.map((enrollment) => (
              <PathCard
                key={enrollment.enrollmentId}
                enrollment={enrollment}
                onViewDetails={handleViewDetails}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
