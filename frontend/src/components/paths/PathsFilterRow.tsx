import { cn } from "@/lib/utils";
import { TIER_LABELS, TIER_ORDER, type TierSlug } from "@/lib/enums/tier";
import {
  PATHS_FILTER_ROW_BUBBLE_ID,
  PATHS_FILTER_TIER_DD_BUBBLE_ID,
  PATHS_FILTER_TIER_GROUP_BUBBLE_ID,
  PATHS_FILTER_TIER_LABEL_BUBBLE_ID,
} from "@/lib/paths/routes";
import { bubbleStyle } from "@/styles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PATHS_TIER_FILTER_ALL = "all" as const;
export type PathsTierFilter = typeof PATHS_TIER_FILTER_ALL | TierSlug;

export interface PathsFilterRowProps {
  selectedTier: PathsTierFilter;
  onTierChange: (tier: PathsTierFilter) => void;
  className?: string;
}

export default function PathsFilterRow({
  selectedTier,
  onTierChange,
  className,
}: PathsFilterRowProps) {
  return (
    <div
      data-bubble-id={PATHS_FILTER_ROW_BUBBLE_ID}
      className={cn(
        bubbleStyle("Group_transparent_"),
        "flex w-full flex-wrap items-center justify-end gap-3",
        className,
      )}
    >
      <div
        data-bubble-id={PATHS_FILTER_TIER_GROUP_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
      >
        <span
          data-bubble-id={PATHS_FILTER_TIER_LABEL_BUBBLE_ID}
          className={cn(bubbleStyle("Text_label_"), "text-sm font-medium text-foreground")}
        >
          Tier
        </span>
        <Select
          value={selectedTier}
          onValueChange={(value) => onTierChange(value as PathsTierFilter)}
        >
          <SelectTrigger
            data-bubble-id={PATHS_FILTER_TIER_DD_BUBBLE_ID}
            className="h-10 min-w-[114px] capitalize"
            aria-label="Filter paths by tier"
          >
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PATHS_TIER_FILTER_ALL}>All Tiers</SelectItem>
            {TIER_ORDER.map((tier) => (
              <SelectItem key={tier} value={tier} className="capitalize">
                {TIER_LABELS[tier]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function matchesTierFilter(
  pathTier: TierSlug,
  filter: PathsTierFilter,
): boolean {
  if (filter === PATHS_TIER_FILTER_ALL) return true;
  return pathTier === filter;
}
