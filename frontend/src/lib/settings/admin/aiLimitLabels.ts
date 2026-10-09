import { AI_TIER_LABELS, type AiEffectiveLimit } from "@/lib/settings/admin/adminAiUsageApi";
import { formatUsd } from "@/lib/settings/admin/aiUsagePeriod";

/** One-line explanation of where a user's effective limit comes from. */
export function describeEffectiveLimit(limit: AiEffectiveLimit): string {
  switch (limit.source) {
    case "custom":
      return `Effective: ${formatUsd(limit.limitUsd)} — custom override`;
    case "unlimited":
      return "Effective: Unlimited — custom override";
    case "plan":
      return `Effective: ${formatUsd(limit.limitUsd)} — from plan ${AI_TIER_LABELS[limit.tier]}`;
    default:
      return `Effective: no limit — plan ${AI_TIER_LABELS[limit.tier]} has none set`;
  }
}
