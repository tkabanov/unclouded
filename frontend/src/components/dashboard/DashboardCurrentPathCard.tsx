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
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { Skeleton } from "@/components/ui/skeleton";

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
      data-bubble-id="ai_RNbBHXSf"
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
    >
      <div
        data-bubble-id="ai_RNbBHXSg"
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex w-full items-center justify-between gap-3",
        )}
      >
        <div
          data-bubble-id="ai_RNbBHXSh"
          className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 items-center gap-2")}
        >
          <Route
            data-bubble-id="ai_RNbBHXSi"
            className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")}
            aria-hidden
          />
          <h2
            data-bubble-id="ai_RNbBHXSj"
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold")}
          >
            Current Path
          </h2>
        </div>

        <Link
          to="/paths"
          data-bubble-id="ai_RNbBHXSk"
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
          data-bubble-id="bTIrY"
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
          data-bubble-id="bTIrY"
          data-style-ref="RepeatingGroup_list_"
          className={cn(bubbleStyle("RepeatingGroup_list_"), "flex w-full flex-col")}
        >
          <div
            data-bubble-id="ai_RNbBHXSl"
            className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-3")}
          >
            <p
              data-bubble-id="ai_RNbBHXSm"
              data-style-ref="Text_label_"
              className={cn(bubbleStyle("Text_label_"), "text-sm font-semibold text-foreground")}
            >
              {enrollment.pathName}
            </p>

            <div
              data-bubble-id="ai_RNbBHXSn"
              className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}
            >
              <div data-bubble-id="bTIvC" className={cn(bubbleStyle("Group_transparent_"), "w-full")}>
                <ProgressBar value={enrollment.progressPercent} />
              </div>

              <div
                data-bubble-id="ai_RNbBHXSo"
                className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-1")}
              >
                <p
                  data-bubble-id="ai_RNbBHXSp"
                  className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
                >
                  {enrollment.progressPercent}% complete
                </p>
                {enrollment.nextStepTitle ? (
                  <p
                    data-bubble-id="ai_RNbBHXSq"
                    className={cn(bubbleStyle("Text_body_"), "text-sm text-foreground")}
                  >
                    Next: {enrollment.nextStepTitle}
                  </p>
                ) : null}
              </div>
            </div>

            {enrollment.nextStepTitle ? (
              <div
                data-bubble-id="ai_RNbBHXSt"
                className={cn(bubbleStyle("Group_transparent_"), "flex items-start gap-2")}
              >
                <ArrowRight
                  data-bubble-id="ai_RNbBHXSu"
                  className={cn(bubbleStyle("Icon_default_"), "mt-0.5 h-4 w-4 shrink-0")}
                  aria-hidden
                />
                <p
                  data-bubble-id="ai_RNbBHXSv"
                  className={cn(bubbleStyle("Text_body_"), "text-sm text-foreground")}
                >
                  {enrollment.nextStepTitle}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p
          data-bubble-id="bTIrf"
          className={cn(bubbleStyle("Text_body_muted_"), "text-sm text-muted-foreground")}
        >
          No active path yet
        </p>
      )}
    </div>
  );
}
