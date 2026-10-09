import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AI_PLAN_TIERS,
  AI_TIER_LABELS,
  type AiPlanTier,
} from "@/lib/settings/admin/adminAiUsageApi";

export type PeriodChoice = "today" | "7d" | "30d" | "custom";

export const ALL_TIERS = "all";
export type TierFilter = AiPlanTier | typeof ALL_TIERS;

export type CustomRange = { from: string; to: string };

/** Calendar days are picked in local time; the dashboard period is the same calendar dates in UTC. */
function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseLocalDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function AiUsageFilters({
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  tier,
  onTierChange,
}: {
  period: PeriodChoice;
  onPeriodChange: (period: PeriodChoice) => void;
  customRange: CustomRange | null;
  onCustomRangeChange: (range: CustomRange) => void;
  tier: TierFilter;
  onTierChange: (tier: TierFilter) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(
    customRange ? { from: parseLocalDate(customRange.from), to: parseLocalDate(customRange.to) } : undefined,
  );

  const applyDraft = (range: DateRange | undefined) => {
    setDraft(range);
    if (range?.from && range.to) {
      onCustomRangeChange({ from: localDateKey(range.from), to: localDateKey(range.to) });
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={period}
        onValueChange={(value) => {
          const next = value as PeriodChoice;
          onPeriodChange(next);
          if (next === "custom" && !customRange) setCalendarOpen(true);
        }}
      >
        <SelectTrigger className="w-[160px]" aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {period === "custom" ? (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" aria-hidden />
              {customRange ? `${customRange.from} → ${customRange.to}` : "Pick dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={applyDraft}
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : null}

      <Select value={tier} onValueChange={(value) => onTierChange(value as TierFilter)}>
        <SelectTrigger className="w-[170px]" aria-label="Plan">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TIERS}>All plans</SelectItem>
          {AI_PLAN_TIERS.map((value) => (
            <SelectItem key={value} value={value}>
              {AI_TIER_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
