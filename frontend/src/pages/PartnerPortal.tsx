import { Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import PartnerClientsList from "@/components/referrals/PartnerClientsList";
import PartnerEarningsSummary from "@/components/referrals/PartnerEarningsSummary";
import ReferralLinkCard from "@/components/referrals/ReferralLinkCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import {
  PARTNER_INACTIVE_NOTICE,
  PARTNER_PORTAL_SUBTITLE,
  PARTNER_PORTAL_TITLE,
} from "@/lib/referrals/referralCopy";
import { buildReferralShareUrl } from "@/lib/share/classificationShareCard";

/** NCLDD-56 — B2B partner portal; non-partners are sent back to the dashboard. */
export default function PartnerPortal() {
  const { portal, loading, error, refresh } = usePartnerPortal();

  if (!loading && !error && !portal) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 md:px-8">
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
              {PARTNER_PORTAL_TITLE}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              {portal ? `${portal.partner.name} · ` : ""}
              {PARTNER_PORTAL_SUBTITLE}
            </p>
          </header>

          {loading && !portal ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error && !portal ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-border/60 p-6 text-sm">
              <p className="text-muted-foreground">We couldn't load your partner portal right now.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                Try again
              </Button>
            </div>
          ) : portal ? (
            <>
              {portal.partner.status === "inactive" ? (
                <p className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  {PARTNER_INACTIVE_NOTICE}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <ReferralLinkCard
                  title="Your partner link"
                  description="Your partner link and code are permanent. Clients who sign up with it are attributed to you."
                  code={portal.partner.code}
                  shareUrl={buildReferralShareUrl(portal.partner.code)}
                />
                <PartnerEarningsSummary portal={portal} />
                <div className="md:col-span-2">
                  <PartnerClientsList clients={portal.clients} />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
