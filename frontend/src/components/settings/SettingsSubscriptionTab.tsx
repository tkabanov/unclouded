import { useCallback, useEffect, useState } from "react";
import { Mail, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SubscriptionPlanCard from "@/components/settings/SubscriptionPlanCard";
import {
  BILLING_ACTIONS_ROW_BUBBLE_ID,
  BILLING_CARD_HEADER_BUBBLE_ID,
  BILLING_CARD_SUBTITLE_BUBBLE_ID,
  BILLING_CARD_TITLE_BUBBLE_ID,
  BILLING_INVOICES_BTN_BUBBLE_ID,
  BILLING_UPDATE_BTN_BUBBLE_ID,
  SUBSCRIPTION_BADGE_WRAP_BUBBLE_ID,
  SUBSCRIPTION_BILLING_CARD_BUBBLE_ID,
  SUBSCRIPTION_CURRENT_CARD_BUBBLE_ID,
  SUBSCRIPTION_CURRENT_HEADER_BUBBLE_ID,
  SUBSCRIPTION_CURRENT_SUBTITLE_BUBBLE_ID,
  SUBSCRIPTION_CURRENT_TEXT_BUBBLE_ID,
  SUBSCRIPTION_CURRENT_TIER_BADGE_BUBBLE_ID,
  SUBSCRIPTION_CURRENT_TITLE_BUBBLE_ID,
  SUBSCRIPTION_PANEL_BUBBLE_ID,
  SUBSCRIPTION_PLANS_GRID_BUBBLE_ID,
  SUBSCRIPTION_TIER_TEXT_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  getCurrentTierLabel,
  loadSubscriptionPlans,
  PREMIUM_CONTACT_EMAIL,
  requestBillingPortal,
  requestInvoices,
  resolveCurrentTier,
  selectSubscriptionPlan,
  type SubscriptionPlanRow,
} from "@/lib/settings/subscriptionApi";
import type { PlanId } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsSubscriptionTab() {
  const { user } = useAuth();
  const { profile, refresh } = useUserProfile();
  const [plans, setPlans] = useState<SubscriptionPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const subscribed = !!profile?.subscribed;
  const currentTier = resolveCurrentTier(subscribed);
  const currentPlanId: PlanId = subscribed ? "pro" : "free";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadSubscriptionPlans()
      .then((rows) => {
        if (!cancelled) setPlans(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load subscription plans.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectPlan = useCallback(
    async (planId: PlanId) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await selectSubscriptionPlan(user.id, planId);
        await refresh();
        toast.success(
          planId === "pro"
            ? "You're now on Pro (demo). Enjoy your upgraded coaching."
            : "Moved back to the Free plan.",
        );
      } catch (err) {
        console.error(err);
        toast.error("Couldn't update your subscription.");
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh, user],
  );

  const handleBillingUpdate = useCallback(async () => {
    try {
      await requestBillingPortal();
      toast.success("Billing portal opened.");
    } catch {
      toast.info("Demo mode: billing isn't connected yet.");
    }
  }, []);

  const handleInvoices = useCallback(async () => {
    try {
      await requestInvoices();
      toast.success("Invoice history loaded.");
    } catch {
      toast.info("Demo mode: invoice history isn't available yet.");
    }
  }, []);

  if (loading) {
    return (
      <div data-bubble-id={SUBSCRIPTION_PANEL_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading subscription…
      </div>
    );
  }

  return (
    <div data-bubble-id={SUBSCRIPTION_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
      <div
        data-bubble-id={SUBSCRIPTION_CURRENT_CARD_BUBBLE_ID}
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-6")}
      >
        <header
          data-bubble-id={SUBSCRIPTION_CURRENT_HEADER_BUBBLE_ID}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div data-bubble-id={SUBSCRIPTION_CURRENT_TEXT_BUBBLE_ID} className="space-y-1">
            <h2
              data-bubble-id={SUBSCRIPTION_CURRENT_TITLE_BUBBLE_ID}
              className={bubbleStyle("Text_heading_3_")}
            >
              Your subscription
            </h2>
            <p
              data-bubble-id={SUBSCRIPTION_CURRENT_SUBTITLE_BUBBLE_ID}
              className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
            >
              Manage your plan and billing preferences.
            </p>
          </div>
          <div data-bubble-id={SUBSCRIPTION_BADGE_WRAP_BUBBLE_ID}>
            <span
              data-bubble-id={SUBSCRIPTION_CURRENT_TIER_BADGE_BUBBLE_ID}
              className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
            >
              <span data-bubble-id={SUBSCRIPTION_TIER_TEXT_BUBBLE_ID}>
                {getCurrentTierLabel(subscribed)}
              </span>
            </span>
          </div>
        </header>
        <p className="text-sm text-muted-foreground">
          Current tier: <strong>{currentTier}</strong> —{" "}
          {subscribed
            ? "You have access to Pro coaching features."
            : "Upgrade to unlock unlimited coaching and reassessment."}
        </p>
      </div>

      <div
        data-bubble-id={SUBSCRIPTION_PLANS_GRID_BUBBLE_ID}
        className="grid items-start gap-4 md:grid-cols-3"
      >
        {plans.map((plan) => (
          <SubscriptionPlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === currentPlanId}
            busy={busy}
            onSelect={(planId) => void handleSelectPlan(planId)}
            onContactPremium={() => setContactOpen(true)}
          />
        ))}
      </div>

      <div
        data-bubble-id={SUBSCRIPTION_BILLING_CARD_BUBBLE_ID}
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-6")}
      >
        <header data-bubble-id={BILLING_CARD_HEADER_BUBBLE_ID} className="space-y-1">
          <h2 data-bubble-id={BILLING_CARD_TITLE_BUBBLE_ID} className={bubbleStyle("Text_heading_3_")}>
            Billing
          </h2>
          <p
            data-bubble-id={BILLING_CARD_SUBTITLE_BUBBLE_ID}
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
          >
            Update payment method or download past invoices.
          </p>
        </header>

        <div
          data-bubble-id={BILLING_ACTIONS_ROW_BUBBLE_ID}
          className="flex flex-wrap gap-3"
        >
          <Button
            type="button"
            data-bubble-id={BILLING_UPDATE_BTN_BUBBLE_ID}
            className={bubbleStyle("Button_primary_")}
            onClick={() => void handleBillingUpdate()}
          >
            Update payment method
          </Button>
          <Button
            type="button"
            variant="outline"
            data-bubble-id={BILLING_INVOICES_BTN_BUBBLE_ID}
            onClick={() => void handleInvoices()}
          >
            View invoices
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Demo mode: upgrades don&apos;t charge a card. Billing isn&apos;t connected yet.
        </p>
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Premium 1:1 coaching
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-left">
              <span className="block">
                Premium members work directly with the Proven Under Pressure coaching team — led
                and certified by Dr. Sam. We match you to a coach based on your PuP 360 data.
              </span>
              <span className="block">
                Tell us a bit about your goals and we&apos;ll set up your coaching match.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button asChild variant="cta" className="gap-1.5">
              <a href={`mailto:${PREMIUM_CONTACT_EMAIL}?subject=Premium%201:1%20coaching%20request`}>
                <Mail className="h-4 w-4" /> Email the coaching team
              </a>
            </Button>
            <Button variant="outline" onClick={() => setContactOpen(false)}>
              Maybe later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
