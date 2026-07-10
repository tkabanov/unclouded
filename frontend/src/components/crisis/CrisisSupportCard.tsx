import { Heart, MessageSquare, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { CrisisHotlineRow } from "./CrisisHotlineRow";

/** RE - crisis support (bTIdW) — shared hotline card for dashboard, paths, and settings mounts. */
export function CrisisSupportCard() {
  return (
    <div className={cn(bubbleStyle("Group_transparent_"), "w-full")}>
      <div
        className={cn(
          "flex w-full flex-col gap-3 rounded-xl border border-primary bg-card p-5 shadow-sm",
        )}
      >
        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full items-start gap-3")}
        >
          <div
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"
          >
            <Heart
              className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5")}
              aria-hidden
            />
          </div>
          <div className={cn(bubbleStyle("Group_transparent_"), "min-w-0 flex-col gap-1")}>
            <h3
              className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
            >
              Crisis Resources
            </h3>
            <p
              className={cn(bubbleStyle("Text_caption_"), "text-xs leading-relaxed text-muted-foreground")}
            >
              Uncloud360 is coaching only. If you need immediate support, reach out to a professional.
            </p>
          </div>
        </div>

        <div
          className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-wrap gap-2")}
        >
          <CrisisHotlineRow
            groupId="bTIds"
            iconId="bTIdt"
            textGroupId="bTIdu"
            nameId="bTIdy"
            detailId="bTIdz"
            icon={<Phone className="h-4 w-4" />}
            name="988 Suicide & Crisis Lifeline"
            detail="Call or text 988 · 24/7"
            href="tel:988"
          />
          <CrisisHotlineRow
            groupId="bTIeA"
            iconId="bTIeE"
            textGroupId="bTIeF"
            nameId="bTIeG"
            detailId="bTIeK"
            icon={<MessageSquare className="h-4 w-4" />}
            name="Crisis Text Line"
            detail="Text HOME to 741741"
            href="sms:741741?body=HOME"
          />
          <CrisisHotlineRow
            groupId="bTIeL"
            iconId="bTIeM"
            textGroupId="bTIeQ"
            nameId="bTIeR"
            detailId="bTIeS"
            icon={<Phone className="h-4 w-4" />}
            name="SAMHSA National Helpline"
            detail="1-800-662-4357 · Free & confidential"
            href="tel:18006624357"
          />
        </div>
      </div>
    </div>
  );
}

export default CrisisSupportCard;
