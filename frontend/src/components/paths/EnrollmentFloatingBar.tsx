import { Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { PATH_ENROLLMENT_STATUS_LABELS } from "@/lib/enums/pathEnrollment";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import { Skeleton } from "@/components/ui/skeleton";

export interface EnrollmentFloatingBarProps {
  className?: string;
}

/** FG - services (bTItS) — enrolled-path switcher strip with RG bTItY. */
export default function EnrollmentFloatingBar({ className }: EnrollmentFloatingBarProps) {
  const { user } = useAuth();
  const { enrollments, loading, selectedEnrollmentId, selectEnrollment } =
    usePathsEnrollmentStore();

  if (!user) return null;
  if (!loading && enrollments.length === 0) return null;

  return (
    <section
      className={cn("w-full min-w-0", className)}
      aria-label="Your enrolled paths"
    >
      <div
        data-style-ref="RepeatingGroup_list_"
        className={cn(
          bubbleStyle("RepeatingGroup_list_"),
          "flex w-full min-w-0 flex-row gap-2 overflow-x-auto pb-1",
        )}
      >
        {loading ? (
          <>
            <Skeleton className="h-12 min-w-[132px] shrink-0 rounded-lg" />
            <Skeleton className="h-12 min-w-[132px] shrink-0 rounded-lg" />
          </>
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
                  "flex h-12 min-w-[132px] shrink-0 items-center gap-2 rounded-lg border px-3 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/60 bg-muted/30 hover:bg-accent/50",
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
    </section>
  );
}
