import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INVITEE_STATUS_LABELS } from "@/lib/referrals/referralCopy";
import type { ReferralInvitee } from "@/lib/referrals/referralOverviewApi";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";

type ReferralInviteesListProps = {
  invitees: ReferralInvitee[];
  totalInvited: number;
};

export default function ReferralInviteesList({ invitees, totalInvited }: ReferralInviteesListProps) {
  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-5 w-5 text-primary" aria-hidden />
          Friends you invited
          <span className="text-sm font-normal text-muted-foreground">({totalInvited})</span>
        </CardTitle>
        <CardDescription className="text-sm">
          For privacy, only first names and last-name initials are shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {invitees.length === 0 ? (
          <p className="text-muted-foreground">
            No one has signed up with your link yet. Share it to get started.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {invitees.map((invitee, index) => (
              <li
                key={`${invitee.displayName}-${invitee.joinedAt ?? index}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{invitee.displayName}</p>
                  {invitee.joinedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Joined {formatSubscriptionDate(invitee.joinedAt)}
                    </p>
                  ) : null}
                </div>
                <Badge variant={invitee.status === "rewarded" ? "default" : "secondary"}>
                  {INVITEE_STATUS_LABELS[invitee.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {totalInvited > invitees.length ? (
          <p className="pt-2 text-xs text-muted-foreground">
            Showing the {invitees.length} most recent of {totalInvited}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
