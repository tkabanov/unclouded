import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  buildClassificationShareCardMetadata,
  type ClassificationShareCardMetadata,
} from "@/lib/share/classificationShareCard";
import { Button } from "@/components/ui/button";

export type ClassificationShareCardProps = {
  classificationKey: string;
  referralCode?: string | null;
  origin?: string;
  metadata?: ClassificationShareCardMetadata;
};

export default function ClassificationShareCard({
  classificationKey,
  referralCode,
  origin,
  metadata,
}: ClassificationShareCardProps) {
  const card =
    metadata ??
    buildClassificationShareCardMetadata({
      classificationKey,
      referralCode,
      origin,
    });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(card.shareUrl);
    } catch (err) {
      console.error("Failed to copy share URL", err);
    }
  };

  return (
    <div
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
    >
      <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}>
        <Share2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}>Share Your Profile</h2>
      </div>

      <div className="space-y-1">
        <p className="text-lg font-semibold">{card.classificationName}</p>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>{card.tagline}</p>
      </div>

      <div className={cn(bubbleStyle("Group_badge_primary_"), "inline-flex w-fit px-3 py-1 text-xs font-medium")}>
        Referral code: {card.referralCode}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={() => void handleCopy()}>
        Copy share link
      </Button>
    </div>
  );
}
