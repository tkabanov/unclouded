import { Award, Lock, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MilestoneListItem } from "@/lib/journal/milestonesApi";
import type { RelapseEventListItem } from "@/lib/journal/relapseEventsApi";
import MilestoneCard from "@/components/journal/MilestoneCard";
import RelapseEventCard from "@/components/journal/RelapseEventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { bubbleStyle } from "@/styles";

export interface MilestonesTabProps {
  milestones: MilestoneListItem[];
  relapseEvents: RelapseEventListItem[];
  loading: boolean;
  onAddMilestone: () => void;
  onLogRelapse: () => void;
  onEditMilestone: (milestone: MilestoneListItem) => void;
  onEditRelapse: (event: RelapseEventListItem) => void;
  className?: string;
}

export default function MilestonesTab({
  milestones,
  relapseEvents,
  loading,
  onAddMilestone,
  onLogRelapse,
  onEditMilestone,
  onEditRelapse,
  className,
}: MilestonesTabProps) {
  return (
    <div className={cn("flex w-full flex-col gap-8", className)}>
      <div
        className={cn(
          bubbleStyle("Group_transparent_"),
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
        >
          <span
            data-style-ref="Icon_primary_"
            className={cn(bubbleStyle("Icon_primary_"), "shrink-0")}
            aria-hidden
          >
            <Award className="h-5 w-5" />
          </span>
          <span
            data-style-ref="Text_label_"
            className={cn(bubbleStyle("Text_label_"), "text-base font-semibold")}
          >
            Your Milestones
            {!loading ? (
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({milestones.length})
              </span>
            ) : null}
          </span>
        </div>

        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-wrap items-center gap-2")}
        >
          <button
            type="button"
            data-style-ref="Button_outline_"
            className={cn(
              bubbleStyle("Button_outline_"),
              "inline-flex shrink-0 items-center gap-1.5",
            )}
            onClick={onLogRelapse}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Log Recovery Event
          </button>
          <button
            type="button"
            data-style-ref="Button_primary_"
            className={cn(
              bubbleStyle("Button_primary_"),
              "inline-flex shrink-0 items-center gap-1.5",
            )}
            onClick={onAddMilestone}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Milestone
          </button>
        </div>
      </div>

      <div
        data-style-ref="RepeatingGroup_list_"
        className={cn(bubbleStyle("RepeatingGroup_list_"), "flex w-full flex-col gap-4")}
      >
        {loading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className={cn(bubbleStyle("Group_card_"), "rounded-xl p-6")}>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="mt-3 h-4 w-1/3" />
                <Skeleton className="mt-4 h-4 w-full" />
              </div>
            ))}
          </div>
        ) : milestones.length === 0 ? (
          <div
            className={cn(
              bubbleStyle("Group_card_muted_"),
              "rounded-xl border border-dashed px-6 py-12 text-center",
            )}
          >
            <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
              No milestones yet. Celebrate a win with Add Milestone.
            </p>
          </div>
        ) : (
          milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onEditMilestone={onEditMilestone}
            />
          ))
        )}
      </div>

      <section
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-4")}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex flex-col gap-4")}
        >
          <div
            data-style-ref="Group_divider_"
            className={cn(bubbleStyle("Group_divider_"), "h-px w-full bg-border")}
            aria-hidden
          />

          <div
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex flex-wrap items-center justify-between gap-3",
            )}
          >
            <div
              className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
            >
              <span
                data-style-ref="Icon_primary_"
                className={cn(bubbleStyle("Icon_primary_"), "shrink-0")}
                aria-hidden
              >
                <RotateCcw className="h-5 w-5" />
              </span>
              <span
                data-style-ref="Text_label_"
                className={cn(bubbleStyle("Text_label_"), "text-base font-semibold")}
              >
                Recovery Events
              </span>
            </div>

            <span
              data-style-ref="Text_caption_"
              className={cn(
                bubbleStyle("Text_caption_"),
                "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground",
              )}
            >
              <Lock className="h-3 w-3" aria-hidden />
              Private
            </span>
          </div>
        </div>

        <div
          data-style-ref="RepeatingGroup_list_"
          className={cn(bubbleStyle("RepeatingGroup_list_"), "flex w-full flex-col gap-3")}
        >
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={cn(bubbleStyle("Group_panel_"), "rounded-xl border p-5")}
                >
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-3 h-4 w-full" />
                </div>
              ))}
            </div>
          ) : relapseEvents.length === 0 ? (
            <div
              className={cn(
                bubbleStyle("Group_card_muted_"),
                "rounded-xl border border-dashed px-6 py-10 text-center",
              )}
            >
              <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
                No recovery events logged. This section stays private to you.
              </p>
            </div>
          ) : (
            relapseEvents.map((event) => (
              <RelapseEventCard key={event.id} event={event} onEditRelapse={onEditRelapse} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
