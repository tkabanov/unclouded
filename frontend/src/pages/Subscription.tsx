import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Sparkles, Users, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PLANS, PREMIUM_CONTACT_EMAIL, type Plan } from "@/lib/plans";
import { useUserProfile } from "@/lib/userProfile";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

export default function Subscription() {
  const navigate = useNavigate();
  const { profile, setSubscribed } = useUserProfile();
  const [busy, setBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const isSubscribed = !!profile?.subscribed;
  const currentPlanId = isSubscribed ? "pro" : "free";

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      await setSubscribed(true);
      toast.success("You're now on Pro (demo). Enjoy your upgraded coaching.");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't complete the upgrade.");
    } finally {
      setBusy(false);
    }
  };

  const handleDowngrade = async () => {
    setBusy(true);
    try {
      await setSubscribed(false);
      toast.success("Moved back to the Free plan.");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update your plan.");
    } finally {
      setBusy(false);
    }
  };

  const iconFor = (id: Plan["id"]) =>
    id === "premium" ? Users : id === "pro" ? Crown : Sparkles;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 -ml-2 text-muted-foreground"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Plans & subscription</h1>
          <p className="text-muted-foreground max-w-2xl">
            Upgrade to unlock unlimited coaching and your 90-day reassessment, or go Premium for
            1:1 human coaching matched to your PuP 360 data.
          </p>
        </div>

        <div className="grid items-start gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = iconFor(plan.id);
            const isCurrent = plan.id === currentPlanId;
            const highlight = plan.id === "pro";
            return (
              <Card
                key={plan.id}
                className={cn(
                  "h-full relative",
                  highlight
                    ? "border-transparent bg-primary text-primary-foreground shadow-xl md:-translate-y-2"
                    : "border-border"
                )}
              >
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
                        highlight
                          ? "bg-primary-foreground text-primary"
                          : "bg-accent text-secondary-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" /> {plan.name}
                    </span>
                    {plan.badge && (
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          highlight ? "opacity-90" : "text-primary"
                        )}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    {plan.period && (
                      <span className={highlight ? "opacity-80" : "text-muted-foreground"}>
                        {plan.period}
                      </span>
                    )}
                  </div>

                  <p className={cn("text-sm", highlight ? "opacity-90" : "text-muted-foreground")}>
                    {plan.tagline}
                  </p>

                  <ul className="space-y-3 pt-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 mt-0.5",
                            highlight ? "" : "text-primary"
                          )}
                        />
                        <span className={highlight ? "" : "text-foreground"}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-1">
                    {isCurrent ? (
                      <Badge
                        variant={highlight ? "secondary" : "outline"}
                        className="w-full justify-center py-2 text-sm"
                      >
                        Your current plan
                      </Badge>
                    ) : plan.cta === "subscribe" ? (
                      <Button
                        className={cn(
                          "w-full",
                          highlight && "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                        )}
                        onClick={handleSubscribe}
                        disabled={busy}
                      >
                        {busy ? "Processing…" : "Upgrade to Pro"}
                      </Button>
                    ) : plan.cta === "contact" ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setContactOpen(true)}
                      >
                        Request coaching match
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleDowngrade}
                        disabled={busy}
                      >
                        Switch to Free
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Demo mode: upgrades don't charge a card. Billing isn't connected yet.
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
                Premium members work directly with the Proven Under Pressure coaching team — led and
                certified by Dr. Sam. We match you to a coach based on your PuP 360 data.
              </span>
              <span className="block">
                Tell us a bit about your goals and we'll set up your coaching match.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start gap-2">
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
    </DashboardLayout>
  );
}
