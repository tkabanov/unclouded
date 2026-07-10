import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { Briefcase, GraduationCap, Heart, Users, HelpCircle } from "lucide-react";
import { CUSTOMER_ROLE_ORDER, CUSTOMER_ROLE_LABELS, CUSTOMER_ROLE_DESCRIPTIONS, type CustomerRoleSlug } from "@/lib/enums/customerProfile";

interface OnboardingRoleProps {
  onNext: (role: string) => void;
}

const ROLE_ICONS: Record<CustomerRoleSlug, typeof Briefcase> = {
  pro: Briefcase,
  student: GraduationCap,
  caregiver: Heart,
  transition: Users,
  retired: HelpCircle,
};

const roles = CUSTOMER_ROLE_ORDER.map((id) => ({
  id,
  label: CUSTOMER_ROLE_LABELS[id],
  description: CUSTOMER_ROLE_DESCRIPTIONS[id],
  icon: ROLE_ICONS[id],
}));

const OnboardingRole = ({ onNext }: OnboardingRoleProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        className={cn(bubbleStyle("Group_transparent_"), "max-w-xl w-full text-center space-y-8")}
      >
        <div className="space-y-3">
          <h1 className={cn(bubbleStyle("Text_heading_1_"), "text-3xl md:text-4xl leading-tight tracking-tight")}>
            How would you describe your current primary role?
          </h1>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-base md:text-lg leading-relaxed max-w-md mx-auto")}>
            This helps us make sure the questions feel relevant to your actual life.
          </p>
        </div>

        <div
          className={cn(bubbleStyle("RepeatingGroup_chips_"), "grid gap-3 max-w-sm mx-auto text-left")}
        >
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selected === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelected(role.id)}
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
                  <div className={bubbleStyle("Text_label_copy_")}>
                    {role.label}
                  </div>
                  <div
                    className={cn(
                      bubbleStyle("Text_small_"),
                      "text-xs font-normal",
                      isSelected ? "text-foreground/70" : "text-muted-foreground/70"
                    )}
                  >
                    {role.description}
                  </div>
                </div>
                {isSelected && (
                  <span className={cn(bubbleStyle("Icon_primary_"), "shrink-0")} aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className="flex items-start gap-2 max-w-sm mx-auto rounded-lg bg-primary/5 px-3 py-2.5 text-left"
        >
          <p className={cn(bubbleStyle("Text_inter_13__400__white_copy_"), "text-xs text-muted-foreground")}>
            Tap a card to select your role. You can update this later in your profile settings.
          </p>
        </div>

        <div className="pt-2">
          <Button
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

export default OnboardingRole;
