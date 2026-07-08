import { Check, Crown, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PLAN_CARD_BUBBLE_ID,
  PLAN_CARD_DESC_BUBBLE_ID,
  PLAN_CARD_FEATURES_BUBBLE_ID,
  PLAN_CARD_ICON_BUBBLE_ID,
  PLAN_CARD_INFO_BUBBLE_ID,
  PLAN_CARD_NAME_BUBBLE_ID,
  PLAN_CARD_PRICE_BUBBLE_ID,
  PLAN_SELECT_BTN_BUBBLE_ID,
} from "@/lib/settings/routes";
import type { SubscriptionPlanRow } from "@/lib/settings/subscriptionApi";
import type { PlanId } from "@/lib/plans";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const PLAN_ICONS: Record<PlanId, typeof Sparkles> = {
  free: Sparkles,
  pro: Crown,
  premium: Users,
};

export interface SubscriptionPlanCardProps {
  plan: SubscriptionPlanRow;
  isCurrent: boolean;
  busy?: boolean;
  onSelect: (planId: PlanId) => void;
  onContactPremium?: () => void;
}

export default function SubscriptionPlanCard({
  plan,
  isCurrent,
  busy = false,
  onSelect,
  onContactPremium,
}: SubscriptionPlanCardProps) {
  const Icon = PLAN_ICONS[plan.id];
  const highlight = plan.id === "pro";

  return (
    <div
      data-bubble-id={PLAN_CARD_BUBBLE_ID}
      data-plan-id={plan.id}
      className={cn(
        bubbleStyle("Group_card_muted_"),
        "flex h-full flex-col gap-4 p-5",
        highlight && "border-primary shadow-md md:-translate-y-1",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          data-bubble-id={PLAN_CARD_ICON_BUBBLE_ID}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
            highlight ? "bg-primary text-primary-foreground" : "bg-accent text-secondary-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span data-bubble-id={PLAN_CARD_NAME_BUBBLE_ID}>{plan.name}</span>
        </span>
        {plan.badge && (
          <span className={cn("text-xs font-semibold", highlight ? "text-primary" : "text-primary")}>
            {plan.badge}
          </span>
        )}
      </div>

      <div data-bubble-id={PLAN_CARD_INFO_BUBBLE_ID} className="space-y-3">
        <div>
          <span data-bubble-id={PLAN_CARD_PRICE_BUBBLE_ID} className="text-3xl font-extrabold">
            {plan.price}
          </span>
          {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
        </div>

        <p data-bubble-id={PLAN_CARD_DESC_BUBBLE_ID} className="text-sm text-muted-foreground">
          {plan.tagline}
        </p>

        <ul data-bubble-id={PLAN_CARD_FEATURES_BUBBLE_ID} className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-2">
        {isCurrent ? (
          <Badge variant="outline" className="w-full justify-center py-2 text-sm">
            Your current plan
          </Badge>
        ) : plan.cta === "contact" ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            data-bubble-id={PLAN_SELECT_BTN_BUBBLE_ID}
            onClick={() => onContactPremium?.()}
          >
            Request coaching match
          </Button>
        ) : plan.cta === "subscribe" ? (
          <Button
            type="button"
            className={cn("w-full", bubbleStyle("Button_primary_"))}
            data-bubble-id={PLAN_SELECT_BTN_BUBBLE_ID}
            disabled={busy}
            onClick={() => onSelect(plan.id)}
          >
            {busy ? "Processing…" : "Upgrade to Pro"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            data-bubble-id={PLAN_SELECT_BTN_BUBBLE_ID}
            disabled={busy}
            onClick={() => onSelect(plan.id)}
          >
            Switch to Free
          </Button>
        )}
      </div>
    </div>
  );
}
