import { useCallback, useState } from "react";

export type JournalTabId = "journal" | "milestones";

export function useJournalTabStore(defaultTab: JournalTabId = "journal") {
  const [activeTab, setActiveTab] = useState<JournalTabId>(defaultTab);

  const selectJournal = useCallback(() => setActiveTab("journal"), []);
  const selectMilestones = useCallback(() => setActiveTab("milestones"), []);

  return {
    activeTab,
    setActiveTab,
    selectJournal,
    selectMilestones,
    isJournalActive: activeTab === "journal",
    isMilestonesActive: activeTab === "milestones",
  };
}
