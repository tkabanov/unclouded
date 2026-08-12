import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { buildModuleListItems } from "@/lib/modules/moduleListState";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatUnlockPhrase(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export default function DashboardNextDeepDiveCard() {
  const { profile } = useDashboardUserContext();

  const upcoming = useMemo(() => {
    if (!profile) return null;
    const items = buildModuleListItems(profile);
    const locked = items
      .filter((item) => item.status === "locked")
      .sort((a, b) => a.daysUntilUnlock - b.daysUntilUnlock);
    return locked[0] ?? null;
  }, [profile]);

  if (!upcoming) return null;

  return (
    <div
      data-testid="dashboard-next-deep-dive"
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col items-center gap-3 px-5 py-6 text-center",
      )}
    >
      <Sparkles className="h-5 w-5 text-primary" aria-hidden />
      <p className={cn(bubbleStyle("Text_body_"), "text-sm text-foreground")}>
        Next deep-dive:{" "}
        <span className="font-semibold">{upcoming.displayTitle}</span> in{" "}
        <span className="font-semibold">{formatUnlockPhrase(upcoming.daysUntilUnlock)}</span>
      </p>
      <Button asChild type="button" variant="outline" size="sm" className="px-4">
        <Link to="/settings?tab=profile">Know Yourself Deeper</Link>
      </Button>
    </div>
  );
}
