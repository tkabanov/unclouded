import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  JOURNAL_CONTENT_AREA_BUBBLE_ID,
  JOURNAL_PAGE_HEADER_BUBBLE_ID,
  JOURNAL_PAGE_SUBTITLE_BUBBLE_ID,
  JOURNAL_PAGE_TITLE_BUBBLE_ID,
  JOURNAL_PAGE_TITLE_GROUP_BUBBLE_ID,
  JOURNAL_TAB_CONTENT_BUBBLE_ID,
  MILESTONES_TAB_CONTENT_BUBBLE_ID,
} from "@/lib/journal/routes";
import { useJournalTabStore } from "@/lib/journal/journalTabStore";
import JournalTabBar from "@/components/journal/JournalTabBar";
import { bubbleStyle } from "@/styles";

export interface JournalPageContentProps {
  journalTab: ReactNode;
  milestonesTab?: ReactNode;
  className?: string;
}

export default function JournalPageContent({
  journalTab,
  milestonesTab,
  className,
}: JournalPageContentProps) {
  const { activeTab, selectJournal, selectMilestones, isJournalActive, isMilestonesActive } =
    useJournalTabStore();

  return (
    <div
      data-bubble-id={JOURNAL_CONTENT_AREA_BUBBLE_ID}
      className={cn("flex w-full flex-col gap-6", className)}
    >
      <header data-bubble-id={JOURNAL_PAGE_HEADER_BUBBLE_ID} className="flex flex-col gap-2">
        <div
          data-bubble-id={JOURNAL_PAGE_TITLE_GROUP_BUBBLE_ID}
          className="flex flex-col gap-2"
        >
          <h1
            data-bubble-id={JOURNAL_PAGE_TITLE_BUBBLE_ID}
            className={bubbleStyle("Text_heading_1_")}
          >
            Journal &amp; Milestones
          </h1>
          <p
            data-bubble-id={JOURNAL_PAGE_SUBTITLE_BUBBLE_ID}
            className={bubbleStyle("Text_body_muted_")}
          >
            Reflect, grow, and celebrate your progress — private to you.
          </p>
        </div>
      </header>

      <JournalTabBar
        activeTab={activeTab}
        onSelectJournal={selectJournal}
        onSelectMilestones={selectMilestones}
      />

      <div
        id="journal-tab-content"
        role="tabpanel"
        data-bubble-id={JOURNAL_TAB_CONTENT_BUBBLE_ID}
        aria-labelledby="journal-tab-btn"
        hidden={!isJournalActive}
        className={cn(!isJournalActive && "hidden")}
      >
        {journalTab}
      </div>

      <div
        id="milestones-tab-content"
        role="tabpanel"
        data-bubble-id={MILESTONES_TAB_CONTENT_BUBBLE_ID}
        aria-labelledby="milestones-tab-btn"
        hidden={!isMilestonesActive}
        className={cn(!isMilestonesActive && "hidden")}
      >
        {milestonesTab ?? (
          <p className={bubbleStyle("Text_body_muted_")}>
            Milestones and relapse tracking will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
