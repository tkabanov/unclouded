import { cn } from "@/lib/utils";
import SettingsTabBar, { settingsTabPanelId } from "@/components/settings/SettingsTabBar";
import SettingsCoachingTab from "@/components/settings/SettingsCoachingTab";
import SettingsNotificationsTab from "@/components/settings/SettingsNotificationsTab";
import SettingsPrivacyTab from "@/components/settings/SettingsPrivacyTab";
import SettingsProfileTab from "@/components/settings/SettingsProfileTab";
import SettingsSecurityTab from "@/components/settings/SettingsSecurityTab";
import SettingsSubscriptionTab from "@/components/settings/SettingsSubscriptionTab";
import SettingsWorkplaceTab from "@/components/settings/SettingsWorkplaceTab";
import SettingsAdminShell from "@/components/settings/admin/SettingsAdminShell";
import { SETTINGS_MODULE_ID } from "@/lib/settings/routes";
import { SETTINGS_TAB, type SettingsTabSlug } from "@/lib/settings/settingsTabStub";
import { useSettingsTabStore } from "@/lib/settings/settingsTabStore";
import { isSettingsTabSlug } from "@/lib/settings/navigation";
import { isSettingsAdminUser, visibleSettingsTabs } from "@/lib/settings/isSettingsAdminUser";
import { useUserProfile } from "@/lib/userProfile";
import { bubbleStyle } from "@/styles";
import { type ReactNode, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const TAB_CONTENT: Partial<Record<SettingsTabSlug, ReactNode>> = {
  [SETTINGS_TAB.PROFILE]: <SettingsProfileTab />,
  [SETTINGS_TAB.COACHING_PREFERENCES]: <SettingsCoachingTab />,
  [SETTINGS_TAB.PRIVACY]: <SettingsPrivacyTab />,
  [SETTINGS_TAB.SECURITY]: <SettingsSecurityTab />,
  [SETTINGS_TAB.NOTIFICATIONS]: <SettingsNotificationsTab />,
  [SETTINGS_TAB.SUBSCRIPTION]: <SettingsSubscriptionTab />,
  [SETTINGS_TAB.WORKPLACE]: <SettingsWorkplaceTab />,
  [SETTINGS_TAB.ADMIN]: <SettingsAdminShell />,
};

export default function SettingsMain() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useUserProfile();
  const tabParam = searchParams.get("tab");
  const isAdmin = isSettingsAdminUser(profile?.roleType);
  const tabs = visibleSettingsTabs(profile?.roleType);
  const resolvedInitialTab =
    isSettingsTabSlug(tabParam) && tabs.includes(tabParam)
      ? tabParam
      : isAdmin
        ? SETTINGS_TAB.ADMIN
        : undefined;
  const { activeTab, setActiveTab, isTabActive } = useSettingsTabStore(resolvedInitialTab);

  useEffect(() => {
    if (isSettingsTabSlug(tabParam) && tabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, tabs, activeTab, setActiveTab]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tabParam !== SETTINGS_TAB.ADMIN) {
      setActiveTab(SETTINGS_TAB.ADMIN);
      setSearchParams({ tab: SETTINGS_TAB.ADMIN }, { replace: true });
    }
  }, [isAdmin, tabParam, setActiveTab, setSearchParams]);

  useEffect(() => {
    if (activeTab === SETTINGS_TAB.ADMIN && !isAdmin) {
      setActiveTab(SETTINGS_TAB.PROFILE);
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, isAdmin, setActiveTab, setSearchParams]);

  const handleSelectTab = (tab: SettingsTabSlug) => {
    setActiveTab(tab);
    if (tab === SETTINGS_TAB.PROFILE) {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div
      data-module-owner={SETTINGS_MODULE_ID}
      className={cn(
        "mx-auto w-full max-w-5xl px-4 pb-8 md:px-8",
        isAdmin ? "pt-8" : "pt-24",
      )}
    >
      <div
        className="flex w-full flex-col gap-6"
      >
        <header
          className="flex flex-col gap-2"
        >
          <h1
            className={bubbleStyle("Text_heading_1_")}
          >
            {isAdmin ? "Admin Console" : "Account Settings"}
          </h1>
          <p
            className={bubbleStyle("Text_body_muted_")}
          >
            {isAdmin
              ? "Manage platform resources, paths, and configuration."
              : "Manage your profile, coaching preferences, privacy, and security."}
          </p>
        </header>

        {!isAdmin ? (
          <SettingsTabBar activeTab={activeTab} tabs={tabs} onSelectTab={handleSelectTab} />
        ) : null}

        <div className="w-full">
          {tabs.map((tab) => (
            <SettingsTabPanel key={tab} tab={tab} active={isTabActive(tab)} />
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
      aria-labelledby={`settings-tab-${tab}`}
      hidden={!active}
      className={cn(!active && "hidden")}
    >
      {active ? TAB_CONTENT[tab] ?? null : null}
    </div>
  );
}
