import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, Instagram, Linkedin, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  buildClassificationShareCardMetadata,
  type ClassificationShareCardMetadata,
} from "@/lib/share/classificationShareCard";
import {
  buildLinkedInShareUrl,
  downloadShareCardBlob,
  renderClassificationShareCardPng,
  shareCardDownloadFilename,
  shareClassificationCardNative,
  SHARE_CARD_BRAND,
} from "@/lib/share/classificationShareCardImage";
import { ensureReferralCode } from "@/lib/share/referralCodeApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import logoIconUrl from "@/assets/uncloud-icon.png";

export type ClassificationShareCardProps = {
  classificationKey: string;
  referralCode?: string | null;
  origin?: string;
  metadata?: ClassificationShareCardMetadata;
};

function ClassificationShareCardPreview({
  card,
}: {
  card: ClassificationShareCardMetadata;
}) {
  return (
    <div
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border shadow-sm"
      style={{ aspectRatio: "9 / 16", backgroundColor: SHARE_CARD_BRAND.background }}
      aria-hidden
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: SHARE_CARD_BRAND.teal }} />
      <div className="flex h-full flex-col items-center px-6 pb-8 pt-10 text-center">
        <img src={logoIconUrl} alt="" className="h-16 w-auto" />
        <div className="mt-8 space-y-4">
          <p
            className="text-2xl font-bold leading-tight"
            style={{ color: SHARE_CARD_BRAND.navy }}
          >
            {card.classificationName}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: SHARE_CARD_BRAND.muted }}>
            {card.tagline}
          </p>
        </div>
        <div
          className="mt-auto w-full rounded-2xl px-4 py-5"
          style={{ backgroundColor: SHARE_CARD_BRAND.tealLight }}
        >
          <p className="text-sm font-semibold" style={{ color: SHARE_CARD_BRAND.teal }}>
            Join me on Uncloud360
          </p>
          <p
            className="mt-2 break-all text-xs font-medium"
            style={{ color: SHARE_CARD_BRAND.navy }}
          >
            {card.shareUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
        <p className="mt-4 text-xs font-semibold" style={{ color: SHARE_CARD_BRAND.muted }}>
          Uncloud360™
        </p>
      </div>
    </div>
  );
}

export default function ClassificationShareCard({
  classificationKey,
  referralCode: referralCodeProp,
  origin,
  metadata,
}: ClassificationShareCardProps) {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(referralCodeProp ?? null);
  const [loadingCode, setLoadingCode] = useState(!referralCodeProp && Boolean(user));
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    setReferralCode(referralCodeProp ?? null);
    setLoadingCode(!referralCodeProp && Boolean(user));
  }, [referralCodeProp, user]);

  useEffect(() => {
    if (referralCodeProp || !user) return;

    let cancelled = false;
    ensureReferralCode(user.id)
      .then((code) => {
        if (!cancelled) setReferralCode(code);
      })
      .catch((error) => {
        console.error("Failed to ensure referral code", error);
        if (!cancelled) toast.error("Couldn't prepare your share link.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCode(false);
      });

    return () => {
      cancelled = true;
    };
  }, [referralCodeProp, user]);

  const resolvedOrigin =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "https://uncloud360.ai");

  const card = useMemo(
    () =>
      metadata ??
      buildClassificationShareCardMetadata({
        classificationKey,
        referralCode,
        origin: resolvedOrigin,
      }),
    [metadata, classificationKey, referralCode, resolvedOrigin],
  );

  const renderShareImage = useCallback(async () => {
    return renderClassificationShareCardPng(card);
  }, [card]);

  const handleCopy = async () => {
    if (loadingCode) return;
    try {
      await navigator.clipboard.writeText(card.shareUrl);
      toast.success("Share link copied");
    } catch (err) {
      console.error("Failed to copy share URL", err);
      toast.error("Couldn't copy link");
    }
  };

  const handleDownload = async () => {
    if (loadingCode) return;
    setBusyAction("download");
    try {
      const blob = await renderShareImage();
      await downloadShareCardBlob(
        blob,
        shareCardDownloadFilename(card.classificationKey),
      );
      toast.success("Share card downloaded");
    } catch (err) {
      console.error("Failed to download share card", err);
      toast.error("Couldn't download image");
    } finally {
      setBusyAction(null);
    }
  };

  const handleInstagramShare = async () => {
    if (loadingCode) return;
    setBusyAction("instagram");
    try {
      const blob = await renderShareImage();
      const result = await shareClassificationCardNative({
        blob,
        shareUrl: card.shareUrl,
        classificationName: card.classificationName,
      });

      if (result === "shared" || result === "cancelled") return;

      await downloadShareCardBlob(
        blob,
        shareCardDownloadFilename(card.classificationKey),
      );
      toast.message("Image saved — open Instagram Stories and add it from your camera roll.");
    } catch (err) {
      console.error("Failed to share to Instagram", err);
      toast.error("Couldn't open share sheet");
    } finally {
      setBusyAction(null);
    }
  };

  const handleLinkedInShare = () => {
    if (loadingCode) return;
    window.open(buildLinkedInShareUrl(card.shareUrl), "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (loadingCode) return;
    setBusyAction("share");
    try {
      const blob = await renderShareImage();
      const result = await shareClassificationCardNative({
        blob,
        shareUrl: card.shareUrl,
        classificationName: card.classificationName,
      });

      if (result === "unsupported") {
        await handleCopy();
        return;
      }
    } catch (err) {
      console.error("Failed native share", err);
      toast.error("Couldn't share");
    } finally {
      setBusyAction(null);
    }
  };

  const actionsDisabled = loadingCode || Boolean(busyAction);

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
    >
      <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}>
        <Share2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}>Share your classification</h2>
      </div>

      <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
        Optional — share a branded card with your network. Nothing clinical, just your classification
        and personal referral link.
      </p>

      <ClassificationShareCardPreview card={card} />

      <div className={cn(bubbleStyle("Group_badge_primary_"), "inline-flex w-fit px-3 py-1 text-xs font-medium")}>
        {loadingCode ? "Preparing referral link…" : `Referral code: ${card.referralCode}`}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={actionsDisabled}
          onClick={() => void handleDownload()}
        >
          <Download className="mr-2 h-4 w-4" />
          {busyAction === "download" ? "Preparing…" : "Download image"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={actionsDisabled}
          onClick={() => void handleCopy()}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy link
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={actionsDisabled}
          onClick={() => void handleInstagramShare()}
        >
          <Instagram className="mr-2 h-4 w-4" />
          {busyAction === "instagram" ? "Preparing…" : "Instagram Stories"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={actionsDisabled}
          onClick={handleLinkedInShare}
        >
          <Linkedin className="mr-2 h-4 w-4" />
          LinkedIn
        </Button>
      </div>

      {typeof navigator.share === "function" ? (
        <Button
          type="button"
          variant="cta"
          className="w-full"
          disabled={actionsDisabled}
          onClick={() => void handleNativeShare()}
        >
          <Share2 className="mr-2 h-4 w-4" />
          {busyAction === "share" ? "Opening share…" : "Share"}
        </Button>
      ) : null}
    </div>
  );
}
