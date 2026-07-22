import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { buildReferralShareUrl } from "@/lib/share/classificationShareCard";
import { ensureReferralCode } from "@/lib/share/referralCodeApi";
import {
  fetchMyReferralSignUpCount,
  formatReferralSignUpCountMessage,
} from "@/lib/share/referralStatsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsReferralStatsSection() {
  const { user } = useAuth();
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setReferralCount(null);
      setShareUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const [count, code] = await Promise.all([
          fetchMyReferralSignUpCount(),
          ensureReferralCode(user.id),
        ]);

        if (cancelled) return;

        setReferralCount(count);
        setShareUrl(buildReferralShareUrl(code));
      } catch {
        if (!cancelled) {
          setReferralCount(null);
          setShareUrl(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Couldn't copy your referral link.");
    }
  }, [shareUrl]);

  return (
    <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-4 p-6")}>
      <header className="space-y-1">
        <h2 className={bubbleStyle("Text_heading_2_")}>Referrals</h2>
        <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
          Share your personal signup link and track how many people join through it.
        </p>
      </header>

      <p className="text-sm text-foreground">
        {loading
          ? "Checking referral sign-ups…"
          : referralCount == null
            ? "Referral stats aren't available right now."
            : formatReferralSignUpCountMessage(referralCount)}
      </p>

      {shareUrl ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="break-all text-sm text-muted-foreground">{shareUrl}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyLink()}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </Button>
        </div>
      ) : null}
    </div>
  );
}
