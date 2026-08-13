import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import SettingsSubscriptionTab from "@/components/settings/SettingsSubscriptionTab";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import { TIER_LABELS, type TierSlug } from "@/lib/enums/tier";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function isEnterpriseAccount(accountType: string | null | undefined): boolean {
  return (accountType ?? "individual").trim().toLowerCase() === "enterprise";
}

export default function Subscription() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const enterprise = isEnterpriseAccount(profile?.accountType);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!enterprise || !user?.id) {
      setOrgName(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: row } = await supabase
        .from("profiles")
        .select("workplaceId")
        .eq("id", user.id)
        .maybeSingle();
      const workplaceId = (row as { workplaceId?: string | null } | null)?.workplaceId;
      if (!workplaceId || cancelled) return;
      const { data: workplace } = await supabase
        .from("workplace")
        .select("name")
        .eq("id", workplaceId)
        .maybeSingle();
      if (!cancelled) {
        setOrgName((workplace as { name?: string } | null)?.name?.trim() || null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enterprise, user?.id]);

  if (enterprise) {
    const tier = (profile?.enterpriseTier ?? profile?.tier ?? "pro").toLowerCase() as TierSlug;
    const tierLabel = TIER_LABELS[tier] ?? "Pro";
    const provider = orgName ?? "your organization";
    return (
      <DashboardLayout>
        <div className={cn("mx-auto w-full max-w-3xl px-4 pb-10 pt-8 md:px-8")}>
          <div className="flex w-full flex-col gap-6">
            <Link
              to="/dashboard"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to dashboard
            </Link>
            <header className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Your access
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Provided by {provider} · {tierLabel}
              </p>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Individual plans, pricing, and checkout are not available on enterprise accounts.
                Contact your HR administrator if you need a plan change.
              </p>
            </header>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={cn("mx-auto w-full max-w-6xl px-4 pb-10 pt-8 md:px-8")}>
        <div className="flex w-full flex-col gap-6">
          <Link
            to="/dashboard"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to dashboard
          </Link>

          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Plans &amp; subscription
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Upgrade, downgrade, or cancel anytime. Cancellations remain active through the end of
              your current billing period.
            </p>
          </header>

          <SettingsSubscriptionTab />
        </div>
      </div>
    </DashboardLayout>
  );
}
