import { Link } from "react-router-dom";
import { Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReferralCreditTotals } from "@/lib/referrals/referralOverviewApi";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function ReferralCreditsSummary({ credits }: { credits: ReferralCreditTotals }) {
  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Gift className="h-5 w-5 text-primary" aria-hidden />
          Coach session credits
        </CardTitle>
        <CardDescription className="text-sm">
          One credit books one 30-minute 1:1 session with a human coach.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Available" value={credits.available} />
          <Stat label="Earned" value={credits.earned} />
          <Stat label="Used" value={credits.used} />
        </div>
        {credits.takenBack > 0 ? (
          <p className="text-xs text-muted-foreground">
            {credits.takenBack} credit{credits.takenBack === 1 ? " was" : "s were"} removed after a
            friend's payment was refunded.
          </p>
        ) : null}
        {credits.available > 0 ? (
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to="/dashboard">Book a 1:1 session</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
