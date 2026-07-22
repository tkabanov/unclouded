import { Briefcase, GraduationCap, Heart, HelpCircle, Users, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CUSTOMER_ROLE_DESCRIPTIONS,
  CUSTOMER_ROLE_LABELS,
  CUSTOMER_ROLE_ORDER,
  type CustomerRoleSlug,
} from "@/lib/enums/customerProfile";
import { bubbleStyle } from "@/styles";

const ROLE_ICONS: Record<CustomerRoleSlug, LucideIcon> = {
  pro: Briefcase,
  student: GraduationCap,
  caregiver: Heart,
  transition: Users,
  retired: HelpCircle,
};

interface CustomerRoleChipGroupProps {
  selected: readonly CustomerRoleSlug[];
  onToggle: (slug: CustomerRoleSlug) => void;
  className?: string;
}

export default function CustomerRoleChipGroup({
  selected,
  onToggle,
  className,
}: CustomerRoleChipGroupProps) {
  return (
    <div
      className={cn(
        bubbleStyle("RepeatingGroup_chips_"),
        "grid gap-3 max-w-sm mx-auto text-left",
        className,
      )}
    >
      {CUSTOMER_ROLE_ORDER.map((id) => {
        const Icon = ROLE_ICONS[id];
        const isSelected = selected.includes(id);

        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={cn(
              bubbleStyle(isSelected ? "Group_chip_active_" : "Group_chip_"),
              "flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 transition-all text-sm w-full",
              isSelected
                ? "border-primary bg-primary/10 text-foreground font-semibold"
                : "border-border bg-background font-normal text-muted-foreground hover:border-primary/40 hover:bg-primary/5",
            )}
          >
            <Icon
              className={cn(
                bubbleStyle(isSelected ? "Icon_primary_" : "Icon_muted_"),
                "h-5 w-5 shrink-0 mt-0.5",
                isSelected ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  bubbleStyle("Text_label_copy_"),
                  isSelected ? "!font-semibold" : "!font-normal",
                )}
              >
                {CUSTOMER_ROLE_LABELS[id]}
              </div>
              <div
                className={cn(
                  bubbleStyle("Text_small_"),
                  "text-xs font-normal",
                  isSelected ? "text-foreground/70" : "text-muted-foreground/70",
                )}
              >
                {CUSTOMER_ROLE_DESCRIPTIONS[id]}
              </div>
            </div>
            {isSelected ? (
              <span className={cn(bubbleStyle("Icon_primary_"), "shrink-0")} aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
