import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import ReferralCreditHistory from "@/components/referrals/ReferralCreditHistory";
import ReferralCreditsSummary from "@/components/referrals/ReferralCreditsSummary";
import ReferralInviteesList from "@/components/referrals/ReferralInviteesList";
import ReferralLinkCard from "@/components/referrals/ReferralLinkCard";
import ReferralProgramRules from "@/components/referrals/ReferralProgramRules";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralOverview } from "@/hooks/useReferralOverview";
import { INVITE_FRIEND_SUBTITLE, INVITE_FRIEND_TITLE } from "@/lib/referrals/referralCopy";
import { buildReferralShareUrl } from "@/lib/share/classificationShareCard";

/** NCLDD-56 — B2C "Invite a friend" page. */
export default function InviteFriend() {
  const { overview, loading, error, refresh } = useReferralOverview();
  const code = overview?.code ?? null;

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
              {INVITE_FRIEND_TITLE}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              {INVITE_FRIEND_SUBTITLE}
            </p>
          </header>

          {loading && !overview ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error && !overview ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-border/60 p-6 text-sm">
              <p className="text-muted-foreground">We couldn't load your referrals right now.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                Try again
              </Button>
            </div>
          ) : overview ? (
            <div className="grid gap-4 md:grid-cols-2">
              <ReferralLinkCard code={code} shareUrl={code ? buildReferralShareUrl(code) : null} />
              <ReferralCreditsSummary credits={overview.credits} />
              <ReferralInviteesList invitees={overview.invitees} totalInvited={overview.totalInvited} />
              <ReferralCreditHistory history={overview.history} />
              <div className="md:col-span-2">
                <ReferralProgramRules />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
