import { useState } from "react";
import { Shield } from "lucide-react";
import AdminPathsTab from "@/components/settings/admin/AdminPathsTab";
import AdminResourcesTab from "@/components/settings/admin/AdminResourcesTab";
import AdminPlansTab from "@/components/settings/admin/AdminPlansTab";
import AdminWorkplacesTab from "@/components/settings/admin/AdminWorkplacesTab";
import AdminAnalyticsTab from "@/components/settings/admin/AdminAnalyticsTab";
import {
  ADMIN_CARD_SUBTITLE_BUBBLE_ID,
  ADMIN_CARD_TITLE_BUBBLE_ID,
  ADMIN_HEADER_CARD_BUBBLE_ID,
  ADMIN_HEADER_TEXT_BUBBLE_ID,
  ADMIN_ICON_WRAP_BUBBLE_ID,
  ADMIN_PANEL_BUBBLE_ID,
  ADMIN_SUB_CONTENTS_BUBBLE_ID,
  ADMIN_SUB_TAB_BAR_BUBBLE_ID,
  ADMIN_TAB_BTN_ANALYTICS_BUBBLE_ID,
  ADMIN_TAB_BTN_PATHS_BUBBLE_ID,
  ADMIN_TAB_BTN_PLANS_BUBBLE_ID,
  ADMIN_TAB_BTN_RESOURCES_BUBBLE_ID,
  ADMIN_TAB_BTN_WORKPLACES_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  ADMIN_SUB_TAB,
  ADMIN_SUB_TAB_LABELS,
  ADMIN_SUB_TAB_ORDER,
  type AdminSubTabSlug,
} from "@/lib/settings/admin/adminTabStore";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SUB_TAB_BUTTON_IDS: Record<AdminSubTabSlug, string> = {
  paths: ADMIN_TAB_BTN_PATHS_BUBBLE_ID,
  resources: ADMIN_TAB_BTN_RESOURCES_BUBBLE_ID,
  plans: ADMIN_TAB_BTN_PLANS_BUBBLE_ID,
  workplaces: ADMIN_TAB_BTN_WORKPLACES_BUBBLE_ID,
  analytics: ADMIN_TAB_BTN_ANALYTICS_BUBBLE_ID,
};

export default function SettingsAdminShell() {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTabSlug>(ADMIN_SUB_TAB.PATHS);

  return (
    <div data-bubble-id={ADMIN_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
      <div
        data-bubble-id={ADMIN_HEADER_CARD_BUBBLE_ID}
        className={cn(bubbleStyle("Group_card_muted_"), "flex gap-4 p-6")}
      >
        <span
          data-bubble-id={ADMIN_ICON_WRAP_BUBBLE_ID}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Shield className="h-5 w-5" />
        </span>
        <div data-bubble-id={ADMIN_HEADER_TEXT_BUBBLE_ID} className="space-y-1">
          <h2 data-bubble-id={ADMIN_CARD_TITLE_BUBBLE_ID} className={bubbleStyle("Text_heading_3_")}>
            Admin console
          </h2>
          <p
            data-bubble-id={ADMIN_CARD_SUBTITLE_BUBBLE_ID}
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
          >
            Manage guided paths, resources, plans, workplaces, and analytics.
          </p>
        </div>
      </div>

      <div
        data-bubble-id={ADMIN_SUB_TAB_BAR_BUBBLE_ID}
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Admin sections"
      >
        {ADMIN_SUB_TAB_ORDER.map((tab) => {
          const active = activeSubTab === tab;
          return (
            <Button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              data-bubble-id={SUB_TAB_BUTTON_IDS[tab]}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSubTab(tab)}
            >
              {ADMIN_SUB_TAB_LABELS[tab]}
            </Button>
          );
        })}
      </div>

      <div data-bubble-id={ADMIN_SUB_CONTENTS_BUBBLE_ID} className="w-full">
        {activeSubTab === ADMIN_SUB_TAB.PATHS && <AdminPathsTab />}
        {activeSubTab === ADMIN_SUB_TAB.RESOURCES && <AdminResourcesTab />}
        {activeSubTab === ADMIN_SUB_TAB.PLANS && <AdminPlansTab />}
        {activeSubTab === ADMIN_SUB_TAB.WORKPLACES && <AdminWorkplacesTab />}
        {activeSubTab === ADMIN_SUB_TAB.ANALYTICS && <AdminAnalyticsTab />}
      </div>
    </div>
  );
}
