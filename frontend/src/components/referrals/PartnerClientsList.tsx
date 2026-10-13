import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PartnerClient } from "@/lib/referrals/partnerPortalApi";
import { PARTNER_CLIENT_STATUS_LABELS, formatMoney } from "@/lib/referrals/referralCopy";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";

type PartnerClientsListProps = {
  clients: PartnerClient[];
  termsConfirmed: boolean;
};

function clientEarnings(client: PartnerClient, termsConfirmed: boolean): string | null {
  if (client.payments === 0) return null;
  if (client.earned.length > 0) {
    return client.earned.map((amount) => formatMoney(amount.cents, amount.currency)).join(" + ");
  }
  return termsConfirmed ? formatMoney(0, "usd") : "Not calculated";
}

export default function PartnerClientsList({ clients, termsConfirmed }: PartnerClientsListProps) {
  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-5 w-5 text-primary" aria-hidden />
          Your clients
          <span className="text-sm font-normal text-muted-foreground">({clients.length})</span>
        </CardTitle>
        <CardDescription className="text-sm">
          People who signed up with your link. For privacy, only first names and last-name initials
          are shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {clients.length === 0 ? (
          <p className="text-muted-foreground">No one has signed up with your link yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {clients.map((client, index) => {
              const earnings = clientEarnings(client, termsConfirmed);
              return (
                <li
                  key={`${client.displayName}-${client.joinedAt ?? index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{client.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        client.joinedAt ? `Joined ${formatSubscriptionDate(client.joinedAt)}` : null,
                        client.payments > 0
                          ? `${client.payments} payment${client.payments === 1 ? "" : "s"}`
                          : null,
                        client.pendingTermsPayments > 0
                          ? `${client.pendingTermsPayments} awaiting terms`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {earnings ? (
                      <span className="font-semibold tabular-nums text-foreground">{earnings}</span>
                    ) : null}
                    <Badge variant={client.status === "paying" ? "default" : "secondary"}>
                      {PARTNER_CLIENT_STATUS_LABELS[client.status]}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
