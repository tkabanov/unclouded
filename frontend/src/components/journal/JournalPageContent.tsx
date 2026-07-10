import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
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
      className={cn("flex w-full flex-col gap-6", className)}
    >
      <header className="flex flex-col gap-2">
        <div
          className="flex flex-col gap-2"
        >
          <h1
            className={bubbleStyle("Text_heading_1_")}
          >
            Journal &amp; Milestones
          </h1>
          <p
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
        aria-labelledby="journal-tab-btn"
        hidden={!isJournalActive}
        className={cn(!isJournalActive && "hidden")}
      >
        {journalTab}
      </div>

      <div
        id="milestones-tab-content"
        role="tabpanel"
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
