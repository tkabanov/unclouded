import { cn } from "@/lib/utils";
import {
  PATH_PAGE_TAB,
  PATH_PAGE_TAB_LABELS,
  PATH_PAGE_TAB_ORDER,
  type PathPageTabSlug,
} from "@/lib/enums/pathPageTabs";
import {
  PATHS_TAB_BAR_BUBBLE_ID,
  PATHS_TAB_BTN_BUBBLE_ID,
} from "@/lib/paths/routes";
import { bubbleStyle } from "@/styles";

export interface PathsTabBarProps {
  activeTab: PathPageTabSlug;
  onSelectTab: (tab: PathPageTabSlug) => void;
  className?: string;
}

const TAB_PANEL_IDS: Record<PathPageTabSlug, string> = {
  [PATH_PAGE_TAB.MY_PATHS]: "paths-guided-panel",
  [PATH_PAGE_TAB.PATHS_LIBRARY]: "paths-resources-panel",
};

export default function PathsTabBar({
  activeTab,
  onSelectTab,
  className,
}: PathsTabBarProps) {
  return (
    <div
      data-bubble-id={PATHS_TAB_BAR_BUBBLE_ID}
      className={cn(
        bubbleStyle("Group_tab_bar_"),
        "inline-flex w-full max-w-md gap-1 sm:w-auto",
        className,
      )}
      role="tablist"
      aria-label="Paths sections"
    >
      {PATH_PAGE_TAB_ORDER.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`paths-tab-${tab}`}
            data-bubble-id={PATHS_TAB_BTN_BUBBLE_ID}
            data-tab-value={tab}
            aria-selected={isActive}
            aria-controls={TAB_PANEL_IDS[tab]}
            className={cn(
              bubbleStyle(isActive ? "Button_tab_active_" : "Button_tab_"),
              "flex-1 border-0 sm:flex-none",
            )}
            onClick={() => onSelectTab(tab)}
          >
            {PATH_PAGE_TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
