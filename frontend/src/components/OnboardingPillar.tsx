import { useState } from "react";
import { ArrowRight, Heart, Briefcase, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  CUSTOMER_PILLAR_ORDER,
  CUSTOMER_PILLAR_LABELS,
  CUSTOMER_PILLAR_DESCRIPTIONS,
  CUSTOMER_PILLAR_BUBBLE_IDS,
  type CustomerPillarSlug,
} from "@/lib/enums/customerProfile";

interface OnboardingPillarProps {
  firstName: string;
  onNext: (pillar: string) => void;
}

const PILLAR_ICONS: Record<CustomerPillarSlug, typeof Heart> = {
  emotional: Heart,
  professional: Briefcase,
  health: Activity,
};

const pillars = CUSTOMER_PILLAR_ORDER.map((id) => ({
  id,
  bubbleId: CUSTOMER_PILLAR_BUBBLE_IDS[id],
  label: CUSTOMER_PILLAR_LABELS[id],
  description: CUSTOMER_PILLAR_DESCRIPTIONS[id],
  icon: PILLAR_ICONS[id],
}));

const OnboardingPillar = ({ firstName, onNext }: OnboardingPillarProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        data-bubble-id="bTHJm"
        className={cn(bubbleStyle("Group_transparent_"), "max-w-xl w-full text-center space-y-8")}
      >
        <div className="space-y-3">
          <h1 className={cn(bubbleStyle("Text_heading_1_"), "text-3xl md:text-4xl leading-tight tracking-tight")}>
            Where is life feeling heaviest right now, {firstName}?
          </h1>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-base md:text-lg leading-relaxed max-w-md mx-auto")}>
            You can access all three areas anytime. This just tells us where to focus first.
          </p>
        </div>

        <div
          data-bubble-id="bTHOZ"
          className={cn(bubbleStyle("RepeatingGroup_chips_"), "grid gap-3 max-w-sm mx-auto text-left")}
        >
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            const isSelected = selected === pillar.id;
            return (
              <button
                key={pillar.id}
                type="button"
                data-bubble-id="bTGNh"
                data-option-bubble-id={pillar.bubbleId}
                onClick={() => setSelected(pillar.id)}
                className={cn(
                  bubbleStyle(isSelected ? "Group_chip_active_" : "Group_chip_"),
                  "flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 transition-all text-sm font-medium w-full",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <Icon
                  className={cn(
                    bubbleStyle(isSelected ? "Icon_primary_" : "Icon_muted_"),
                    "h-5 w-5 shrink-0 mt-0.5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div data-bubble-id="bTGNn" className={bubbleStyle("Text_label_copy_")}>
                    {pillar.label}
                  </div>
                  <div
                    data-bubble-id="bTGNo"
                    className={cn(
                      bubbleStyle("Text_small_"),
                      "text-xs font-normal",
                      isSelected ? "text-foreground/70" : "text-muted-foreground/70"
                    )}
                  >
                    {pillar.description}
                  </div>
                </div>
                {isSelected && (
                  <span data-bubble-id="bTHPt" className={cn(bubbleStyle("Icon_primary_"), "shrink-0")} aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          data-bubble-id="bTHQR"
          className="flex items-start gap-2 max-w-sm mx-auto rounded-lg bg-primary/5 px-3 py-2.5 text-left"
        >
          <p data-bubble-id="bTGOj" className={cn(bubbleStyle("Text_inter_13__400__white_copy_"), "text-xs text-muted-foreground")}>
            Select one to continue. You can adjust your focus pillar at any time from your profile.
          </p>
        </div>

        <div data-bubble-id="bTGOk" className="pt-2">
          <Button
            data-bubble-id="bTGOp"
            variant="cta"
            size="lg"
            onClick={() => selected && onNext(selected)}
            disabled={!selected}
            className={cn(bubbleStyle("Button_primary_"), "group")}
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPillar;
