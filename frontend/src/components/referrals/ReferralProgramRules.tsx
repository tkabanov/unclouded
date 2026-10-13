import { Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REFERRAL_PROGRAM_RULES } from "@/lib/referrals/referralCopy";

export default function ReferralProgramRules() {
  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Info className="h-5 w-5 text-primary" aria-hidden />
          How it works
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {REFERRAL_PROGRAM_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
