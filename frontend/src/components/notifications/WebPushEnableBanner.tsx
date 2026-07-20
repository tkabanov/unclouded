import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  dismissWebPushOffer,
  enableWebPushNotifications,
  getWebPushBannerState,
  type WebPushBannerState,
} from "@/lib/notifications/webPushRegistration";

/** REQ-07 — user-gesture prompt for vulnerable cohort Web Push (browsers block auto-prompts). */
export default function WebPushEnableBanner() {
  const [bannerState, setBannerState] = useState<WebPushBannerState | null>(() =>
    getWebPushBannerState(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBannerState(getWebPushBannerState());
  }, []);

  if (!bannerState) return null;

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await enableWebPushNotifications();
      if (result.status === "subscribed") {
        setBannerState(null);
        return;
      }
      if (result.status === "denied") {
        setBannerState("denied");
        return;
      }
      setError(result.reason ?? "Could not enable notifications. Try again later.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    dismissWebPushOffer();
    setBannerState(null);
  };

  const bodyCopy =
    bannerState === "denied"
      ? "Notifications are blocked for this site. Open your browser’s site settings for Uncloud360 and allow notifications, then reload."
      : bannerState === "unsupported"
        ? "This browser does not support web push notifications. Email outreach will still work when you are away."
        : bannerState === "misconfigured"
          ? "Push is temporarily unavailable on this build. Email outreach will still work when you are away."
          : "Optional browser notifications when you have been away for a while. Warm and low-pressure — no guilt about missed sessions.";

  return (
    <div
      data-testid="web-push-enable-banner"
      data-style-ref="Group_card_"
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col items-stretch gap-4 border-primary/20 bg-primary/5 p-6 md:flex-row md:items-center md:p-8",
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2
            className={cn(
              bubbleStyle("Text_heading_2_"),
              "text-lg font-semibold text-foreground md:text-xl",
            )}
          >
            Gentle check-ins from Kota
          </h2>
          <p
            className={cn(
              bubbleStyle("Text_body_muted_"),
              "max-w-xl text-sm leading-relaxed text-muted-foreground",
            )}
          >
            {bodyCopy}
          </p>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
        {bannerState === "prompt" ? (
          <Button type="button" onClick={() => void handleEnable()} disabled={busy}>
            {busy ? "Enabling…" : "Enable notifications"}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={handleDismiss} disabled={busy}>
          <BellOff className="mr-2 h-4 w-4" aria-hidden />
          Not now
        </Button>
      </div>
    </div>
  );
}
