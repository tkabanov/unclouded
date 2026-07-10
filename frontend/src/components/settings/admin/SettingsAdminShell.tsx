import { useState } from "react";
import { Shield } from "lucide-react";
import AdminPathsTab from "@/components/settings/admin/AdminPathsTab";
import AdminResourcesTab from "@/components/settings/admin/AdminResourcesTab";
import AdminPlansTab from "@/components/settings/admin/AdminPlansTab";
import AdminWorkplacesTab from "@/components/settings/admin/AdminWorkplacesTab";
import AdminAnalyticsTab from "@/components/settings/admin/AdminAnalyticsTab";
import {
  ADMIN_SUB_TAB,
  ADMIN_SUB_TAB_LABELS,
  ADMIN_SUB_TAB_ORDER,
  type AdminSubTabSlug,
} from "@/lib/settings/admin/adminTabStore";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SettingsAdminShell() {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTabSlug>(ADMIN_SUB_TAB.PATHS);

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(bubbleStyle("Group_card_muted_"), "flex gap-4 p-6")}
      >
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Shield className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className={bubbleStyle("Text_heading_3_")}>
            Admin console
          </h2>
          <p
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
          >
            Manage guided paths, resources, plans, workplaces, and analytics.
          </p>
        </div>
      </div>

      <div
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
              className={cn(
                bubbleStyle(active ? "Button_tab_active_" : "Button_tab_"),
                "h-9",
              )}
              size="sm"
              variant="ghost"
              onClick={() => setActiveSubTab(tab)}
            >
              {ADMIN_SUB_TAB_LABELS[tab]}
            </Button>
          );
        })}
      </div>

      <div className="w-full">
        {activeSubTab === ADMIN_SUB_TAB.PATHS && <AdminPathsTab />}
        {activeSubTab === ADMIN_SUB_TAB.RESOURCES && <AdminResourcesTab />}
        {activeSubTab === ADMIN_SUB_TAB.PLANS && <AdminPlansTab />}
        {activeSubTab === ADMIN_SUB_TAB.WORKPLACES && <AdminWorkplacesTab />}
        {activeSubTab === ADMIN_SUB_TAB.ANALYTICS && <AdminAnalyticsTab />}
      </div>
    </div>
  );
}
