import { useCallback } from "react";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReferralLinkCardProps = {
  code: string | null;
  shareUrl: string | null;
  title?: string;
  description?: string;
};

/** Permanent personal referral link + code with copy buttons (B2C and partner pages). */
export default function ReferralLinkCard({
  code,
  shareUrl,
  title = "Your referral link",
  description = "Your link and code are permanent. Share them anywhere.",
}: ReferralLinkCardProps) {
  const copy = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Couldn't copy your ${label.toLowerCase()}.`);
    }
  }, []);

  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Link2 className="h-5 w-5 text-primary" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {shareUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
              {shareUrl}
            </p>
            <Button type="button" size="sm" onClick={() => void copy(shareUrl, "Referral link")}>
              <Copy className="mr-2 h-4 w-4" aria-hidden />
              Copy link
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">Your link isn't available right now.</p>
        )}
        {code ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Code:</span>
            <span className="font-mono font-semibold tracking-wider text-foreground">{code}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => void copy(code, "Referral code")}
              aria-label="Copy referral code"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
