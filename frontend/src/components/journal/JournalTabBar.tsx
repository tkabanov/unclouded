import { cn } from "@/lib/utils";
import type { JournalTabId } from "@/lib/journal/journalTabStore";
import { bubbleStyle } from "@/styles";

export interface JournalTabBarProps {
  activeTab: JournalTabId;
  onSelectJournal: () => void;
  onSelectMilestones: () => void;
  className?: string;
}

export default function JournalTabBar({
  activeTab,
  onSelectJournal,
  onSelectMilestones,
  className,
}: JournalTabBarProps) {
  const journalActive = activeTab === "journal";

  return (
    <div
      className={cn(
        bubbleStyle("Group_tab_bar_"),
        "inline-flex w-full max-w-md gap-1 sm:w-auto",
        className,
      )}
      role="tablist"
      aria-label="Journal sections"
    >
      <button
        type="button"
        role="tab"
        id="journal-tab-btn"
        aria-selected={journalActive}
        aria-controls="journal-tab-content"
        className={cn(
          bubbleStyle(journalActive ? "Button_tab_active_" : "Button_tab_"),
          "flex-1 border-0 sm:flex-none",
        )}
        onClick={onSelectJournal}
      >
        Journal
      </button>
      <button
        type="button"
        role="tab"
        id="milestones-tab-btn"
        aria-selected={!journalActive}
        aria-controls="milestones-tab-content"
        className={cn(
          bubbleStyle(journalActive ? "Button_tab_" : "Button_tab_active_"),
          "flex-1 border-0 sm:flex-none",
        )}
        onClick={onSelectMilestones}
      >
        Milestones
      </button>
    </div>
  );
}
