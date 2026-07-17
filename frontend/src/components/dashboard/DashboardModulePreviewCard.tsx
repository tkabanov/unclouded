import { useMemo } from "react";
import { AlertTriangle, ArrowRight, Layers } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import {
  buildModuleListItems,
  countCompletedModuleItems,
  formatDaysUntilUnlockLabel,
} from "@/lib/modules/moduleListState";
import { resolveDashboardModulePreview } from "@/lib/modules/dashboardModulePreview";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function DashboardModulePreviewCard() {
  const {
    profile,
    classificationKey,
    recoveryModeActive,
    griefModeActive,
    traumaInformedMode,
  } = useDashboardUserContext();

  const preview = useMemo(() => {
    if (!profile) {
      return null;
    }

    return resolveDashboardModulePreview({
      profile,
      classificationKey,
      healthFlags: {
        recovery_mode_active: recoveryModeActive,
        grief_mode_active: griefModeActive,
        trauma_informed_mode: traumaInformedMode,
      },
    });
  }, [profile, classificationKey, recoveryModeActive, griefModeActive, traumaInformedMode]);

  const completedCount = useMemo(() => {
    if (!profile) {
      return 0;
    }
    return countCompletedModuleItems(buildModuleListItems(profile));
  }, [profile]);

  if (!preview) {
    return null;
  }

  const isAvailable = preview.status === "available";
  const isSensitive = preview.sensitivityTier === "high";

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
        <div className={cn(bubbleStyle("Group_transparent_"), "flex min-w-0 items-center gap-2")}>
          <Layers
            className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")}
            aria-hidden
          />
          <h2
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold")}
          >
            Know Yourself Deeper
          </h2>
        </div>

        <Link
          to="/settings?tab=profile"
          data-style-ref="Text_link_"
          className={cn(
            bubbleStyle("Text_link_"),
            "shrink-0 text-sm font-medium hover:underline",
          )}
        >
          View all
        </Link>
      </div>

      <div className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-3")}>
        <div className="flex flex-wrap items-center gap-2">
          <p
            data-style-ref="Text_label_"
            className={cn(bubbleStyle("Text_label_"), "text-sm font-semibold text-foreground")}
          >
            {preview.displayTitle}
          </p>
          {isSensitive ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex text-muted-foreground"
                    aria-label="Contains sensitive content"
                  >
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Contains sensitive content</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>

        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm text-muted-foreground")}>
          {preview.presentationCopy}
        </p>

        <p className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}>
          {completedCount}/6 completed
        </p>

        {isAvailable ? (
          <Button
            asChild
            type="button"
            data-style-ref="Button_primary_"
            className={cn(bubbleStyle("Button_primary_"), "w-full gap-1.5 sm:w-auto")}
          >
            <Link to={`/settings/know-yourself/${preview.slug}`}>
              Start
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full sm:w-auto"
          >
            {formatDaysUntilUnlockLabel(preview.daysUntilUnlock)}
          </Button>
        )}
      </div>
    </div>
  );
}
