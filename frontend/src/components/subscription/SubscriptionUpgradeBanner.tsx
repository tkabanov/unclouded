import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { FREE_TIER_UPGRADE_BANNER } from "@/lib/subscription/subscriptionCopy";
import { subscriptionPath } from "@/lib/subscription/routes";
import { cn } from "@/lib/utils";

export interface SubscriptionUpgradeBannerProps {
  className?: string;
}

/** Upsell strip for Free-tier users — links to subscription management. */
export default function SubscriptionUpgradeBanner({ className }: SubscriptionUpgradeBannerProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">{FREE_TIER_UPGRADE_BANNER.title}</p>
          <p className="text-sm text-muted-foreground">{FREE_TIER_UPGRADE_BANNER.description}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="cta"
        className="shrink-0"
        onClick={() => navigate(subscriptionPath())}
      >
        {FREE_TIER_UPGRADE_BANNER.ctaLabel}
      </Button>
    </div>
  );
}
