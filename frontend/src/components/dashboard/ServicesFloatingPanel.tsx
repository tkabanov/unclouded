import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import {
  fetchPathEnrollments,
  type PathEnrollmentListItem,
} from "@/lib/dashboard/pathEnrollmentApi";
import { PATH_ENROLLMENT_STATUS_LABELS } from "@/lib/enums/pathEnrollment";
import { Skeleton } from "@/components/ui/skeleton";

/** FG - services (bTJEO) — page-level floating panel listing pathenrollment1 rows. */
export default function ServicesFloatingPanel() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<PathEnrollmentListItem[]>([]);

  const loadEnrollments = useCallback(async () => {
    if (!user) {
      setEnrollments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await fetchPathEnrollments(user.id, profile?.onboardingData ?? null);
      setEnrollments(rows);
    } catch (err) {
      console.error("Failed to load path enrollments", err);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.onboardingData]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  if (!user) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[60] hidden w-[min(280px,calc(100vw-2rem))] md:block"
      aria-label="Your path enrollments"
    >
      <div className="pointer-events-auto rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
        <p className={cn(bubbleStyle("Text_caption_"), "mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground")}>
          Your paths
        </p>

        <div
          data-style-ref="RepeatingGroup_list_"
          className={cn(bubbleStyle("RepeatingGroup_list_"), "flex max-h-[232px] flex-col gap-1 overflow-y-auto")}
        >
          {loading ? (
            <>
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </>
          ) : enrollments.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate("/paths")}
              className={cn(
                bubbleStyle("Group_transparent_"),
                "flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-3 text-left transition-colors hover:bg-accent/50",
              )}
            >
              <Route className={cn(bubbleStyle("Icon_muted_"), "h-4 w-4 shrink-0")} aria-hidden />
              <span className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}>
                Browse coaching paths
              </span>
            </button>
          ) : (
            enrollments.map((row) => (
              <button
                key={row.enrollmentId}
                type="button"
                onClick={() => navigate("/paths")}
                className={cn(
                  bubbleStyle("Group_transparent_"),
                  "flex min-h-[56px] w-full items-center gap-2 rounded-lg border border-border/60 p-3 text-left transition-colors hover:bg-accent/50",
                )}
              >
                <Route className={cn(bubbleStyle("Icon_primary_"), "h-4 w-4 shrink-0")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn(bubbleStyle("Text_label_"), "truncate text-sm font-medium text-foreground")}>
                    {row.pathName}
                  </p>
                  <p className={cn(bubbleStyle("Text_small_"), "text-xs capitalize text-muted-foreground")}>
                    {PATH_ENROLLMENT_STATUS_LABELS[row.status]}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
