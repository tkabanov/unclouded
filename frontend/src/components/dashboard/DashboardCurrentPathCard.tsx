import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import {
  fetchCurrentPathEnrollment,
  type CurrentPathEnrollment,
} from "@/lib/dashboard/pathEnrollmentApi";
import { PATHS_ROUTE, SESSION_SEARCH_PARAM } from "@/lib/paths/routes";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function sessionCompletionHref(sessionId: string): string {
  return `${PATHS_ROUTE}?${SESSION_SEARCH_PARAM}=${encodeURIComponent(sessionId)}`;
}

export default function DashboardCurrentPathCard() {
  const { user } = useAuth();
  const { profile } = useDashboardUserContext();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<CurrentPathEnrollment | null>(null);

  const loadEnrollment = useCallback(async () => {
    if (!user) {
      setEnrollment(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchCurrentPathEnrollment(user.id, profile?.onboardingData ?? null);
      setEnrollment(data);
    } catch (err) {
      console.error("Failed to load path enrollment", err);
      setEnrollment({
        pathName: "",
        progressPercent: 0,
        nextStepTitle: null,
        hasActiveEnrollment: false,
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile?.onboardingData]);

  useEffect(() => {
    void loadEnrollment();
  }, [loadEnrollment]);

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
    >
      <div
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex w-full items-center justify-between gap-3",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 items-center gap-2")}
        >
          <Route
            className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")}
            aria-hidden
          />
          <h2
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold")}
          >
            Current Path
          </h2>
        </div>

        <Link
          to={PATHS_ROUTE}
          data-style-ref="Text_link_"
          className={cn(
            bubbleStyle("Text_link_"),
            "shrink-0 text-sm font-medium hover:underline",
          )}
        >
          Browse paths
        </Link>
      </div>

      {loading ? (
        <div
          data-style-ref="RepeatingGroup_list_"
          className={cn(bubbleStyle("RepeatingGroup_list_"), "flex w-full flex-col")}
        >
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      ) : enrollment?.hasActiveEnrollment ? (
        <div
          data-style-ref="RepeatingGroup_list_"
          className={cn(bubbleStyle("RepeatingGroup_list_"), "flex w-full flex-col")}
        >
          <div
            className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-3")}
          >
            <p
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "text-sm font-semibold text-foreground")}
            >
              {enrollment.pathName}
            </p>

            <div
              className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
            >
              <div className={cn(bubbleStyle("Group_transparent_"), "w-full")}>
                <ProgressBar value={enrollment.progressPercent} />
              </div>

              <div
                className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-1")}
              >
                <p
                  className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
                >
                  {enrollment.progressPercent}% complete
                </p>
                {enrollment.nextStepTitle ? (
                  <p
                    className={cn(bubbleStyle("Text_body_"), "text-sm text-foreground")}
                  >
                    Next: {enrollment.nextStepTitle}
                  </p>
                ) : null}
              </div>
            </div>

            {enrollment.currentSessionId ? (
              <Button
                asChild
                type="button"
                data-style-ref="Button_primary_"
                className={cn(bubbleStyle("Button_primary_"), "w-full gap-1.5 sm:w-auto")}
              >
                <Link to={sessionCompletionHref(enrollment.currentSessionId)}>
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p
          className={cn(bubbleStyle("Text_body_muted_"), "text-sm text-muted-foreground")}
        >
          No active path yet
        </p>
      )}
    </div>
  );
}
