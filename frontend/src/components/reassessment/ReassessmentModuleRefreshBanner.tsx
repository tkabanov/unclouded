import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MODULE_DISPLAY_TITLES,
  type ModuleSlug,
} from "@/lib/modules/moduleSlugs";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

interface ReassessmentModuleRefreshBannerProps {
  refreshOfferedSlugs: ModuleSlug[];
  acceleratedSlugs: ModuleSlug[];
}

function formatModuleList(slugs: ModuleSlug[]): string {
  return slugs.map((slug) => MODULE_DISPLAY_TITLES[slug]).join(", ");
}

export default function ReassessmentModuleRefreshBanner({
  refreshOfferedSlugs,
  acceleratedSlugs,
}: ReassessmentModuleRefreshBannerProps) {
  const hasRefresh = refreshOfferedSlugs.length > 0;
  const hasUnlock = acceleratedSlugs.length > 0;

  if (!hasRefresh && !hasUnlock) {
    return null;
  }

  const bodyParts: string[] = [];
  if (hasRefresh) {
    bodyParts.push(
      `You can refresh: ${formatModuleList(refreshOfferedSlugs)}.`,
    );
  }
  if (hasUnlock) {
    bodyParts.push(
      `Newly available: ${formatModuleList(acceleratedSlugs)}.`,
    );
  }

  return (
    <div
      className={cn(
        bubbleStyle("Group_card_muted_"),
        "space-y-3 border-primary/20 bg-primary/5 p-6",
      )}
    >
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Know Yourself Deeper — updated for your reassessment
          </h2>
          <p className="text-sm text-muted-foreground">
            {bodyParts.join(" ")}
            {" "}
            Gidget will use refreshed answers when you update a module.
          </p>
        </div>
      </div>
      <Button asChild variant="cta" size="sm">
        <Link to="/settings?tab=profile">Go to Know Yourself Deeper</Link>
      </Button>
    </div>
  );
}
