import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { referralHistoryLabel } from "@/lib/referrals/referralCopy";
import type { ReferralCreditHistoryItem } from "@/lib/referrals/referralOverviewApi";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";
import { cn } from "@/lib/utils";

function detail(item: ReferralCreditHistoryItem): string | null {
  if (item.friendName) return item.friendName;
  if (item.sessionAt) return `Session on ${formatSubscriptionDate(item.sessionAt)}`;
  return null;
}

export default function ReferralCreditHistory({ history }: { history: ReferralCreditHistoryItem[] }) {
  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <History className="h-5 w-5 text-primary" aria-hidden />
          Credit history
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {history.length === 0 ? (
          <p className="text-muted-foreground">No credits yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {history.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{referralHistoryLabel(item.reason)}</p>
                  <p className="text-xs text-muted-foreground">
                    {[formatSubscriptionDate(item.createdAt), detail(item)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {item.delta !== 0 ? (
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      item.delta > 0 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {item.delta > 0 ? `+${item.delta}` : item.delta}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
