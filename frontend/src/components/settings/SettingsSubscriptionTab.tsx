import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Mail, Users } from "lucide-react";
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
  getCurrentTierLabel,
  loadSubscriptionPlans,
  PREMIUM_CONTACT_EMAIL,
  requestBillingPortal,
  requestInvoices,
  resolveCurrentTier,
  selectSubscriptionPlan,
  type BillingInvoice,
  type SubscriptionPlanRow,
} from "@/lib/settings/subscriptionApi";
import type { PlanId } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import { isReassessmentDue } from "@/lib/reassessment";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsSubscriptionTab() {
  const { user } = useAuth();
  const { profile, refresh } = useUserProfile();
  const [plans, setPlans] = useState<SubscriptionPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalMessage, setPortalMessage] = useState("");
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);

  const subscribed = !!profile?.subscribed;
  const currentTier = resolveCurrentTier(subscribed, profile?.tier);
  const currentPlanId: PlanId =
    currentTier === "premium" ? "premium" : currentTier === "pro" ? "pro" : "free";
  const reassessmentDue =
    subscribed && isReassessmentDue(profile?.onboardingCompletedAt ?? null) && !profile?.reassessmentResults;

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
        const result = await selectSubscriptionPlan(planId);
        if (result.status === "billing_required") {
          toast.message(result.message ?? "Checkout is not connected yet.");
          return;
        }
        if (result.status !== "ok") {
          toast.error(result.message ?? "Couldn't update your subscription.");
          return;
        }
        await refresh();
        toast.success(
          planId === "pro"
            ? "You're now on Pro."
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
      const result = await requestBillingPortal();
      const portalUrl = result.url ?? result.portal_url;
      if (portalUrl) {
        window.open(portalUrl, "_blank", "noopener,noreferrer");
        return;
      }

      setPortalMessage(
        result.message ??
          (result.status === "demo"
            ? "Billing portal stub — connect Stripe in production."
            : "Billing portal is ready."),
      );
      setPortalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't open billing portal.";
      toast.error(message);
    }
  }, []);

  const handleInvoices = useCallback(async () => {
    try {
      const rows = await requestInvoices();
      setInvoices(rows);
      setInvoicesOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't load invoice history.";
      toast.error(message);
    }
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading subscription…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-6")}
      >
        <header
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <h2
              className={bubbleStyle("Text_heading_3_")}
            >
              Your subscription
            </h2>
            <p
              className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
            >
              Manage your plan and billing preferences.
            </p>
          </div>
          <div>
            <span
              className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
            >
              <span>
                {getCurrentTierLabel(subscribed, profile?.tier)}
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

      {reassessmentDue ? (
        <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">Your 90-day reassessment is ready</p>
              <p className="text-sm text-muted-foreground">
                Retake the assessment to see how your scores have changed since day one.
              </p>
            </div>
          </div>
          <Button variant="cta" className="shrink-0" asChild>
            <Link to="/onboarding?reassessment=1">Start reassessment</Link>
          </Button>
        </div>
      ) : null}

      <div
        className={cn(bubbleStyle("RepeatingGroup_list_"), "grid items-start gap-4 md:grid-cols-3")}
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
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-6")}
      >
        <header className="space-y-1">
          <h2 className={bubbleStyle("Text_heading_3_")}>
            Billing
          </h2>
          <p
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
          >
            Update payment method or download past invoices. Demo billing stubs return sample data
            until Stripe is connected in production.
          </p>
        </header>

        <div
          className="flex flex-wrap gap-3"
        >
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            onClick={() => void handleBillingUpdate()}
          >
            Update payment method
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleInvoices()}
          >
            View invoices
          </Button>
        </div>

      </div>

      <Dialog open={portalOpen} onOpenChange={setPortalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Billing portal</DialogTitle>
            <DialogDescription className="pt-2 text-left">{portalMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invoicesOpen} onOpenChange={setInvoicesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice history</DialogTitle>
            <DialogDescription className="pt-2 text-left">
              {invoices.length
                ? "Sample invoice rows from the billing stub — not real payment history until Stripe is connected."
                : "No invoices are available yet."}
            </DialogDescription>
          </DialogHeader>
          {invoices.length > 0 ? (
            <ul className="divide-y rounded-md border text-sm">
              {invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="font-medium">{invoice.id}</span>
                  <span className="text-muted-foreground">{invoice.date}</span>
                  <span>{invoice.amount}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoicesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
