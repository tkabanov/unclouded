import { Check, Crown, Sparkles, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import {
  FOUNDING_MEMBER_LABEL,
  FOUNDING_MEMBER_SECONDARY_LABEL,
  planCatalogEntry,
} from "@/lib/subscription/planCatalog";
import type { PlanCardAction, PlanCardState } from "@/lib/subscription/subscriptionActions";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const PLAN_ICONS: Record<TierSlug, typeof Sparkles> = {
  [TIER.FREE]: Sparkles,
  [TIER.PRO]: Crown,
  [TIER.PREMIUM]: Users,
};

/** One labelled fact under the price, e.g. "Next renewal date: April 15, 2026". */
export type PlanCardDetail = { label: string; value: string };

export interface SubscriptionPlanCardProps {
  tier: TierSlug;
  price: string;
  priceSuffix: string;
  state: PlanCardState;
  /** Renders the Founding Member label pair instead of the plain Pro heading. */
  showFoundingLabel?: boolean;
  details?: PlanCardDetail[];
  notice?: string;
  /** Full scheduled-cancel badge, e.g. "Canceled — active until April 15, 2026". */
  scheduledCancelStatus?: string | null;
  pendingLabel?: string | null;
  disabled?: boolean;
  onAction: (action: PlanCardAction) => void;
}

function actionVariant(action: PlanCardAction["kind"]): "cta" | "outline" {
  return action === "upgrade" || action === "upgradeToPremium" || action === "resume"
    ? "cta"
    : "outline";
}

export default function SubscriptionPlanCard({
  tier,
  price,
  priceSuffix,
  state,
  showFoundingLabel = false,
  details = [],
  notice,
  scheduledCancelStatus = null,
  pendingLabel = null,
  disabled = false,
  onAction,
}: SubscriptionPlanCardProps) {
  const catalog = planCatalogEntry(tier);
  const Icon = PLAN_ICONS[tier];
  const highlight = state.isCurrent || (tier === TIER.PRO && !state.isCurrent);
  const { primary } = state;

  return (
    <div
      data-plan-tier={tier}
      data-current-plan={state.isCurrent ? "true" : "false"}
      className={cn(
        bubbleStyle("Group_card_muted_"),
        "flex h-full flex-col gap-4 p-5",
        state.isCurrent && "border-primary shadow-md",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
            highlight ? "bg-primary text-primary-foreground" : "bg-accent text-secondary-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          <span>{showFoundingLabel ? FOUNDING_MEMBER_LABEL : catalog.name}</span>
        </span>
        {showFoundingLabel ? (
          <span className="text-xs font-medium text-muted-foreground">
            {FOUNDING_MEMBER_SECONDARY_LABEL}
          </span>
        ) : catalog.badge ? (
          <span className="text-xs font-semibold text-primary">{catalog.badge}</span>
        ) : null}
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-3xl font-extrabold">{price}</span>
          {priceSuffix ? <span className="text-muted-foreground">{priceSuffix}</span> : null}
        </div>

        <p className="text-sm text-muted-foreground">{catalog.tagline}</p>

        {details.length > 0 ? (
          <dl className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            {details.map((detail) => (
              <div key={detail.label} className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">{detail.label}</dt>
                <dd className="font-medium">{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

        <ul className="space-y-2">
          {catalog.features.map((feature) => (
            <li key={feature.label} className="flex items-start gap-2 text-sm">
              {feature.included ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className={cn(!feature.included && "text-muted-foreground")}>
                {feature.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto space-y-2 pt-2">
        {state.isCurrent ? (
          primary.kind === "resume" ? (
            <Badge
              variant="outline"
              className="w-full justify-center py-2 text-sm"
              data-testid="scheduled-cancel-status"
            >
              {scheduledCancelStatus ?? "Canceled"}
            </Badge>
          ) : (
            <Badge variant="outline" className="w-full justify-center py-2 text-sm">
              Current plan
            </Badge>
          )
        ) : null}

        {primary.kind === "currentPlan" || primary.kind === "none" ? null : primary.kind ===
          "futurePlan" ? (
          <p className="text-center text-sm text-muted-foreground">{primary.label}</p>
        ) : (
          <Button
            type="button"
            variant={actionVariant(primary.kind)}
            className={cn("w-full", actionVariant(primary.kind) === "cta" && bubbleStyle("Button_primary_"))}
            disabled={disabled || !!pendingLabel}
            onClick={() => onAction(primary)}
          >
            {pendingLabel ?? primary.label}
          </Button>
        )}
      </div>
    </div>
  );
}
