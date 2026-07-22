import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DASHBOARD_MODULE_ID } from "@/lib/dashboard/routes";
import { DashboardUserProvider } from "@/hooks/useDashboardUser";
import { bubbleStyle } from "@/styles";

export interface DashboardMainSlots {
  /** Greeting card + quick actions (DASH-02). */
  greetingRow?: ReactNode;
  /** Banners and CTAs between greeting row and grid. */
  beforeGrid?: ReactNode;
  /** Full-width assessment results card (Lovable dashboard). */
  assessmentResults?: ReactNode;
  /** Day 0 vs Day 90 progress after reassessment (Lovable dashboard). */
  reassessmentProgress?: ReactNode;
  /** Left column — daily check-in + insights (DASH-04, DASH-05). */
  dailyCheckIn?: ReactNode;
  /** Right column — next deep-dive module preview (DASH Zone G). */
  modulePreview?: ReactNode;
  /** Right column — current path card (DASH-05). */
  currentPath?: ReactNode;
  /** Right column — chat preview (DASH-06). */
  chatPreview?: ReactNode;
  /** Right column — journal preview (DASH-06). */
  journalPreview?: ReactNode;
  /** Right column — crisis support card (DASH-07). */
  crisisSupport?: ReactNode;
}

export interface DashboardMainProps {
  slots?: DashboardMainSlots;
  className?: string;
}

function DashboardSlot({  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export default function DashboardMain({ slots = {}, className }: DashboardMainProps) {
  return (
    <DashboardUserProvider>
      <div
        data-module-owner={DASHBOARD_MODULE_ID}
        className={cn(
          bubbleStyle("Group_transparent_"),
          "mx-auto w-full max-w-6xl px-4 py-8 md:px-8",
          className,
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-8")}
        >
          <DashboardSlot>
            {slots.greetingRow}
          </DashboardSlot>

          {slots.beforeGrid}

          {slots.reassessmentProgress ? (
            <DashboardSlot>{slots.reassessmentProgress}</DashboardSlot>
          ) : null}

          {slots.assessmentResults ? (
            <DashboardSlot>{slots.assessmentResults}</DashboardSlot>
          ) : null}

          <div
            className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
          >
            <DashboardSlot
              className="flex min-w-0 flex-col gap-6"
            >
              {slots.dailyCheckIn}
            </DashboardSlot>

            <div className="flex min-w-0 flex-col gap-6">
              <DashboardSlot>
                {slots.modulePreview}
              </DashboardSlot>
              <DashboardSlot>
                {slots.currentPath}
              </DashboardSlot>
              <DashboardSlot>
                {slots.chatPreview}
              </DashboardSlot>
              <DashboardSlot>
                {slots.journalPreview}
              </DashboardSlot>
              {slots.crisisSupport ? (
                <DashboardSlot>
                  {slots.crisisSupport}
                </DashboardSlot>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </DashboardUserProvider>
  );
}
