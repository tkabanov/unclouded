import { Fragment } from "react";
import { Check, Crown, Leaf, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import {
  FOUNDING_MEMBER_LABEL,
  planCatalogEntry,
} from "@/lib/subscription/planCatalog";
import {
  PLAN_COMPARISON_SECTIONS,
  PLAN_COMPARISON_TIERS,
} from "@/lib/subscription/planComparisonMatrix";
import type { PlanCardAction, PlanCardState } from "@/lib/subscription/subscriptionActions";
import { cn } from "@/lib/utils";

const PLAN_ICONS = {
  [TIER.FREE]: Leaf,
  [TIER.PRO]: Crown,
  [TIER.PREMIUM]: Users,
} as const;

function actionVariant(action: PlanCardAction["kind"]): "default" | "outline" {
  return action === "upgrade" || action === "upgradeToPremium" || action === "resume"
    ? "default"
    : "outline";
}

export type SubscriptionComparisonColumn = {
  tier: TierSlug;
  price: string;
  priceSuffix: string;
  priceNote?: string | null;
  showFoundingLabel?: boolean;
  state: PlanCardState;
  scheduledCancelStatus?: string | null;
  pendingLabel?: string | null;
};

export interface SubscriptionComparisonTableProps {
  columns: SubscriptionComparisonColumn[];
  disabled?: boolean;
  onAction: (action: PlanCardAction) => void;
  billingIntervalLabel: string;
}

export default function SubscriptionComparisonTable({
  columns,
  disabled = false,
  onAction,
  billingIntervalLabel,
}: SubscriptionComparisonTableProps) {
  const byTier = Object.fromEntries(columns.map((column) => [column.tier, column])) as Record<
    TierSlug,
    SubscriptionComparisonColumn
  >;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-[28%] px-4 py-5 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Features
              </th>
              {PLAN_COMPARISON_TIERS.map((tier) => {
                const column = byTier[tier];
                const catalog = planCatalogEntry(tier);
                const Icon = PLAN_ICONS[tier];
                const { primary } = column.state;

                return (
                  <th
                    key={tier}
                    className="w-[24%] px-4 py-5 text-center align-bottom"
                    data-plan-tier={tier}
                    data-current-plan={column.state.isCurrent ? "true" : "false"}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                          {column.showFoundingLabel ? FOUNDING_MEMBER_LABEL : catalog.name}
                        </span>
                        {!column.showFoundingLabel && catalog.badge ? (
                          <span className="text-xs font-medium text-primary">{catalog.badge}</span>
                        ) : null}
                      </div>

                      <div>
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {column.price}
                        </span>
                        {column.priceSuffix ? (
                          <span className="text-sm text-muted-foreground">{column.priceSuffix}</span>
                        ) : null}
                        {column.priceNote ? (
                          <p className="mt-1 text-xs text-muted-foreground">{column.priceNote}</p>
                        ) : null}
                      </div>

                      <div className="w-full max-w-[11rem]">
                        {column.state.isCurrent ? (
                          primary.kind === "resume" ? (
                            <div className="space-y-2">
                              <Badge
                                variant="outline"
                                className="w-full justify-center py-2 text-xs font-medium"
                                data-testid="scheduled-cancel-status"
                              >
                                {column.scheduledCancelStatus ?? "Canceled"}
                              </Badge>
                              <Button
                                type="button"
                                variant="default"
                                className="w-full"
                                disabled={disabled || !!column.pendingLabel}
                                onClick={() => onAction(primary)}
                              >
                                {column.pendingLabel ?? primary.label}
                              </Button>
                            </div>
                          ) : primary.kind === "cancel" ||
                            primary.kind === "downgradeToPro" ||
                            primary.kind === "keepPremium" ||
                            primary.kind === "upgradeToPremium" ? (
                            <div className="space-y-2">
                              <Badge className="w-full justify-center bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary">
                                Current plan
                              </Badge>
                              <Button
                                type="button"
                                variant={actionVariant(primary.kind)}
                                className="w-full"
                                disabled={disabled || !!column.pendingLabel}
                                onClick={() => onAction(primary)}
                              >
                                {column.pendingLabel ?? primary.label}
                              </Button>
                            </div>
                          ) : (
                            <Badge className="w-full justify-center bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary">
                              Current plan
                            </Badge>
                          )
                        ) : primary.kind === "currentPlan" || primary.kind === "none" ? (
                          <span className="block h-9" />
                        ) : primary.kind === "futurePlan" ? (
                          <p className="text-xs text-muted-foreground">{primary.label}</p>
                        ) : (
                          <Button
                            type="button"
                            variant={actionVariant(primary.kind)}
                            className="w-full"
                            disabled={disabled || !!column.pendingLabel}
                            onClick={() => onAction(primary)}
                          >
                            {column.pendingLabel ?? primary.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {PLAN_COMPARISON_SECTIONS.map((section) => (
              <Fragment key={section.title}>
                <tr className="bg-muted/40">
                  <td
                    colSpan={4}
                    className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {section.title}
                  </td>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label} className="border-t border-border/70">
                    <td className="px-4 py-3 text-left text-foreground">{row.label}</td>
                    {PLAN_COMPARISON_TIERS.map((tier) => (
                      <td key={tier} className="px-4 py-3 text-center">
                        {row.included[tier] ? (
                          <Check className="mx-auto h-4 w-4 text-primary" aria-label="Included" />
                        ) : (
                          <span className="text-muted-foreground/70" aria-label="Not included">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Billing: {billingIntervalLabel}
      </div>
    </div>
  );
}
