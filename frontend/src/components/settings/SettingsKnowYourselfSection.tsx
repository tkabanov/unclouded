import { useState } from "react";
import { toast } from "sonner";

import LifeEventRefreshDialog from "@/components/settings/knowYourself/LifeEventRefreshDialog";
import ModuleListCard from "@/components/settings/knowYourself/ModuleListCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  buildModuleListItems,
  countCompletedModuleItems,
} from "@/lib/modules/moduleListState";
import { offerAllCompletedModuleRefresh } from "@/lib/modules/moduleRefreshApi";
import type { ModuleProfileInput } from "@/lib/modules/readModuleProfile";
import { useUserProfile } from "@/lib/userProfile";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

interface SettingsKnowYourselfSectionProps {
  profile: ModuleProfileInput | null | undefined;
}

export default function SettingsKnowYourselfSection({ profile }: SettingsKnowYourselfSectionProps) {
  const { user } = useAuth();
  const { refresh } = useUserProfile();
  const [bulkRefreshing, setBulkRefreshing] = useState(false);

  if (!profile) {
    return null;
  }

  const items = buildModuleListItems(profile);
  const completedCount = countCompletedModuleItems(items);

  const handleBulkRefresh = async () => {
    if (!user) return;
    setBulkRefreshing(true);
    try {
      const offered = await offerAllCompletedModuleRefresh(user.id);
      await refresh();
      if (offered.length === 0) {
        toast.info("Complete at least one module before refreshing.");
        return;
      }
      toast.success(`${offered.length} module${offered.length === 1 ? "" : "s"} ready to refresh.`);
    } catch (error) {
      console.error(error);
      toast.error("Could not refresh modules. Please try again.");
    } finally {
      setBulkRefreshing(false);
    }
  };

  return (
    <section className={cn(bubbleStyle("Group_card_"), "space-y-4 p-6")}>
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Know Yourself Deeper</h2>
          <p className="text-sm text-muted-foreground">
            Optional deep-dives that help Gidget understand the layers beneath your scores.{" "}
            {completedCount}/6 completed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LifeEventRefreshDialog onSubmitted={refresh} />
          {completedCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={bulkRefreshing}
              onClick={() => void handleBulkRefresh()}
            >
              {bulkRefreshing ? "Preparing…" : "Refresh completed modules"}
            </Button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <ModuleListCard key={item.slug} item={item} onRefreshOffered={refresh} />
        ))}
      </ul>
    </section>
  );
}
