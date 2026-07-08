import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_CHAT_PREVIEW_SLOT_BUBBLE_ID,
  DASHBOARD_CONTENT_BUBBLE_ID,
  DASHBOARD_CRISIS_SLOT_BUBBLE_ID,
  DASHBOARD_CURRENT_PATH_SLOT_BUBBLE_ID,
  DASHBOARD_DAILY_CHECKIN_SLOT_BUBBLE_ID,
  DASHBOARD_GRID_BUBBLE_ID,
  DASHBOARD_GREETING_ROW_BUBBLE_ID,
  DASHBOARD_JOURNAL_PREVIEW_SLOT_BUBBLE_ID,
  DASHBOARD_MAIN_BUBBLE_ID,
  DASHBOARD_MODULE_ID,
} from "@/lib/dashboard/routes";
import { DashboardUserProvider } from "@/hooks/useDashboardUser";
import { bubbleStyle } from "@/styles";

export interface DashboardMainSlots {
  /** Greeting card + quick actions (DASH-02). */
  greetingRow?: ReactNode;
  /** Banners and CTAs between greeting row and grid. */
  beforeGrid?: ReactNode;
  /** Left column — daily check-in + insights (DASH-04, DASH-05). */
  dailyCheckIn?: ReactNode;
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

function DashboardSlot({
  bubbleId,
  children,
  className,
}: {
  bubbleId: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div data-bubble-id={bubbleId} className={className}>
      {children}
    </div>
  );
}

export default function DashboardMain({ slots = {}, className }: DashboardMainProps) {
  return (
    <DashboardUserProvider>
      <div
        data-bubble-id={DASHBOARD_MAIN_BUBBLE_ID}
        data-module-owner={DASHBOARD_MODULE_ID}
        className={cn(
          bubbleStyle("Group_transparent_"),
          "mx-auto w-full max-w-6xl px-4 py-8 md:px-8",
          className,
        )}
      >
        <div
          data-bubble-id={DASHBOARD_CONTENT_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-8")}
        >
          <DashboardSlot bubbleId={DASHBOARD_GREETING_ROW_BUBBLE_ID}>
            {slots.greetingRow}
          </DashboardSlot>

          {slots.beforeGrid}

          <div
            data-bubble-id={DASHBOARD_GRID_BUBBLE_ID}
            className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
          >
            <DashboardSlot
              bubbleId={DASHBOARD_DAILY_CHECKIN_SLOT_BUBBLE_ID}
              className="flex min-w-0 flex-col gap-6"
            >
              {slots.dailyCheckIn}
            </DashboardSlot>

            <div className="flex min-w-0 flex-col gap-6">
              <DashboardSlot bubbleId={DASHBOARD_CURRENT_PATH_SLOT_BUBBLE_ID}>
                {slots.currentPath}
              </DashboardSlot>
              <DashboardSlot bubbleId={DASHBOARD_CHAT_PREVIEW_SLOT_BUBBLE_ID}>
                {slots.chatPreview}
              </DashboardSlot>
              <DashboardSlot bubbleId={DASHBOARD_JOURNAL_PREVIEW_SLOT_BUBBLE_ID}>
                {slots.journalPreview}
              </DashboardSlot>
              <DashboardSlot bubbleId={DASHBOARD_CRISIS_SLOT_BUBBLE_ID}>
                {slots.crisisSupport}
              </DashboardSlot>
            </div>
          </div>
        </div>
      </div>
    </DashboardUserProvider>
  );
}
