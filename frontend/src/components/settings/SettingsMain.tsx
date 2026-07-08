import { cn } from "@/lib/utils";
import SettingsTabBar, { settingsTabPanelId } from "@/components/settings/SettingsTabBar";
import {
  SETTINGS_CONTENT_WRAPPER_BUBBLE_ID,
  SETTINGS_MAIN_BUBBLE_ID,
  SETTINGS_MODULE_ID,
  SETTINGS_PAGE_HEADER_BUBBLE_ID,
  SETTINGS_PAGE_SUBTITLE_BUBBLE_ID,
  SETTINGS_PAGE_TITLE_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  SETTINGS_TAB_ORDER,
  SETTINGS_TAB_PANEL_BUBBLE_IDS,
  SETTINGS_TAB_PANELS_BUBBLE_ID,
  type SettingsTabSlug,
} from "@/lib/settings/settingsTabStub";
import { useSettingsTabStore } from "@/lib/settings/settingsTabStore";
import { bubbleStyle } from "@/styles";

export default function SettingsMain() {
  const { activeTab, setActiveTab, isTabActive } = useSettingsTabStore();

  return (
    <div
      data-bubble-id={SETTINGS_MAIN_BUBBLE_ID}
      data-module-owner={SETTINGS_MODULE_ID}
      className="mx-auto w-full max-w-5xl px-4 pb-8 pt-24 md:px-8"
    >
      <div
        data-bubble-id={SETTINGS_CONTENT_WRAPPER_BUBBLE_ID}
        className="flex w-full flex-col gap-6"
      >
        <header
          data-bubble-id={SETTINGS_PAGE_HEADER_BUBBLE_ID}
          className="flex flex-col gap-2"
        >
          <h1
            data-bubble-id={SETTINGS_PAGE_TITLE_BUBBLE_ID}
            className={bubbleStyle("Text_heading_1_")}
          >
            Account Settings
          </h1>
          <p
            data-bubble-id={SETTINGS_PAGE_SUBTITLE_BUBBLE_ID}
            className={bubbleStyle("Text_body_muted_")}
          >
            Manage your profile, coaching preferences, privacy, and security.
          </p>
        </header>

        <SettingsTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

        <div data-bubble-id={SETTINGS_TAB_PANELS_BUBBLE_ID} className="w-full">
          {SETTINGS_TAB_ORDER.map((tab) => (
            <SettingsTabPanel
              key={tab}
              tab={tab}
              active={isTabActive(tab)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SettingsTabPanelProps {
  tab: SettingsTabSlug;
  active: boolean;
}

function SettingsTabPanel({ tab, active }: SettingsTabPanelProps) {
  return (
    <div
      id={settingsTabPanelId(tab)}
      role="tabpanel"
      data-bubble-id={SETTINGS_TAB_PANEL_BUBBLE_IDS[tab]}
      aria-labelledby={`settings-tab-${tab}`}
      hidden={!active}
      className={cn(!active && "hidden")}
    />
  );
}
