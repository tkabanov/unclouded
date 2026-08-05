import { cn } from "@/lib/utils";
import {
  CUSTOMER_PILLAR_ORDER,
  type CustomerPillarSlug,
} from "@/lib/enums/customerProfile";
import { TIER_LABELS, TIER_ORDER, type TierSlug } from "@/lib/enums/tier";
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

export const PATHS_PILLAR_FILTER_ALL = "all" as const;
export type PathsPillarFilter = typeof PATHS_PILLAR_FILTER_ALL | CustomerPillarSlug;

/** Short filter labels (PL-FIL-002: Emotional / Professional / Health). */
export const PATHS_PILLAR_FILTER_LABELS: Record<CustomerPillarSlug, string> = {
  emotional: "Emotional",
  professional: "Professional",
  health: "Health",
};

export interface PathsFilterRowProps {
  selectedTier: PathsTierFilter;
  onTierChange: (tier: PathsTierFilter) => void;
  selectedPillar: PathsPillarFilter;
  onPillarChange: (pillar: PathsPillarFilter) => void;
  className?: string;
}

export default function PathsFilterRow({
  selectedTier,
  onTierChange,
  selectedPillar,
  onPillarChange,
  className,
}: PathsFilterRowProps) {
  return (
    <div
      className={cn(
        bubbleStyle("Group_transparent_"),
        "flex w-full flex-wrap items-center justify-end gap-3",
        className,
      )}
    >
      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
      >
        <span
          className={cn(bubbleStyle("Text_label_"), "text-sm font-medium text-foreground")}
        >
          Pillar
        </span>
        <Select
          value={selectedPillar}
          onValueChange={(value) => onPillarChange(value as PathsPillarFilter)}
        >
          <SelectTrigger
            className="h-10 min-w-[130px]"
            aria-label="Filter paths by pillar"
          >
            <SelectValue placeholder="All Pillars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PATHS_PILLAR_FILTER_ALL}>All Pillars</SelectItem>
            {CUSTOMER_PILLAR_ORDER.map((pillar) => (
              <SelectItem key={pillar} value={pillar}>
                {PATHS_PILLAR_FILTER_LABELS[pillar]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
      >
        <span
          className={cn(bubbleStyle("Text_label_"), "text-sm font-medium text-foreground")}
        >
          Tier
        </span>
        <Select
          value={selectedTier}
          onValueChange={(value) => onTierChange(value as PathsTierFilter)}
        >
          <SelectTrigger
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

export function matchesPillarFilter(
  pathPillar: string | null | undefined,
  filter: PathsPillarFilter,
): boolean {
  if (filter === PATHS_PILLAR_FILTER_ALL) return true;
  return (pathPillar ?? "").trim().toLowerCase() === filter;
}
