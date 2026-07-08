import { cn } from "@/lib/utils";
import {
  SETTINGS_TAB_BUTTON_BUBBLE_IDS,
  SETTINGS_TAB_DISPLAY_LABELS,
  SETTINGS_TAB_ORDER,
  type SettingsTabSlug,
} from "@/lib/settings/settingsTabStub";
import { SETTINGS_TAB_BAR_BUBBLE_ID } from "@/lib/settings/routes";
import { bubbleStyle } from "@/styles";

export interface SettingsTabBarProps {
  activeTab: SettingsTabSlug;
  onSelectTab: (tab: SettingsTabSlug) => void;
  className?: string;
}

function settingsTabPanelId(tab: SettingsTabSlug): string {
  return `settings-tab-panel-${tab}`;
}

export default function SettingsTabBar({
  activeTab,
  onSelectTab,
  className,
}: SettingsTabBarProps) {
  return (
    <div
      data-bubble-id={SETTINGS_TAB_BAR_BUBBLE_ID}
      data-style-ref="Group_tab_bar_"
      className={cn(
        bubbleStyle("Group_tab_bar_"),
        "flex w-full flex-wrap gap-1",
        className,
      )}
      role="tablist"
      aria-label="Settings sections"
    >
      {SETTINGS_TAB_ORDER.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`settings-tab-${tab}`}
            data-bubble-id={SETTINGS_TAB_BUTTON_BUBBLE_IDS[tab]}
            data-tab-value={tab}
            aria-selected={isActive}
            aria-controls={settingsTabPanelId(tab)}
            className={cn(
              bubbleStyle(isActive ? "Button_tab_active_" : "Button_tab_"),
              "border-0",
            )}
            onClick={() => onSelectTab(tab)}
          >
            {SETTINGS_TAB_DISPLAY_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}

export { settingsTabPanelId };
