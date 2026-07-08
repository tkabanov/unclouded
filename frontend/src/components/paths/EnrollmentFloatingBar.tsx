import { Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { PATH_ENROLLMENT_STATUS_LABELS } from "@/lib/enums/pathEnrollment";
import {
  PATHS_ENROLLMENT_RG_BUBBLE_ID,
  PATHS_FLOATING_BAR_BUBBLE_ID,
} from "@/lib/paths/routes";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import { Skeleton } from "@/components/ui/skeleton";

/** FG - services (bTItS) — paths page floating enrollment strip with RG bTItY. */
export default function EnrollmentFloatingBar() {
  const { user } = useAuth();
  const { enrollments, loading, selectedEnrollmentId, selectEnrollment } =
    usePathsEnrollmentStore();

  if (!user) return null;

  return (
    <div
      data-bubble-id={PATHS_FLOATING_BAR_BUBBLE_ID}
      className="pointer-events-none fixed left-0 right-0 top-16 z-[60] w-full min-w-0 px-4 md:px-8"
      aria-label="Your enrolled paths"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-5xl rounded-xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
        <div
          data-bubble-id={PATHS_ENROLLMENT_RG_BUBBLE_ID}
          data-style-ref="RepeatingGroup_list_"
          className={cn(
            bubbleStyle("RepeatingGroup_list_"),
            "flex min-h-[56px] w-full min-w-[140px] flex-row gap-2 overflow-x-auto",
          )}
        >
          {loading ? (
            <>
              <Skeleton className="h-14 min-w-[140px] shrink-0 rounded-lg" />
              <Skeleton className="h-14 min-w-[140px] shrink-0 rounded-lg" />
            </>
          ) : enrollments.length === 0 ? (
            <div
              className={cn(
                bubbleStyle("Group_transparent_"),
                "flex min-h-[56px] min-w-[140px] items-center gap-2 rounded-lg border border-dashed border-border px-3",
              )}
            >
              <Route className={cn(bubbleStyle("Icon_muted_"), "h-4 w-4 shrink-0")} aria-hidden />
              <span className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}>
                No enrolled paths yet
              </span>
            </div>
          ) : (
            enrollments.map((row) => {
              const isSelected = row.enrollmentId === selectedEnrollmentId;
              return (
                <button
                  key={row.enrollmentId}
                  type="button"
                  onClick={() => selectEnrollment(row.enrollmentId)}
                  aria-pressed={isSelected}
                  className={cn(
                    bubbleStyle("Group_transparent_"),
                    "flex min-h-[56px] min-w-[140px] shrink-0 items-center gap-2 rounded-lg border px-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:bg-accent/50",
                  )}
                >
                  <Route
                    className={cn(
                      isSelected ? bubbleStyle("Icon_primary_") : bubbleStyle("Icon_muted_"),
                      "h-4 w-4 shrink-0",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        bubbleStyle("Text_label_"),
                        "truncate text-sm font-medium text-foreground",
                      )}
                    >
                      {row.pathName}
                    </p>
                    <p className={cn(bubbleStyle("Text_small_"), "text-xs capitalize text-muted-foreground")}>
                      {PATH_ENROLLMENT_STATUS_LABELS[row.status]}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
