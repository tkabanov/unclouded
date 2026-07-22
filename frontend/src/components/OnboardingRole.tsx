import { useState } from "react";
import CustomerRoleChipGroup from "@/components/CustomerRoleChipGroup";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import type { CustomerRoleSlug } from "@/lib/enums/customerProfile";
import { toggleCustomerRoleSelection } from "@/lib/enums/customerRoleTypes";

interface OnboardingRoleProps extends OnboardingStepChromeProps {
  defaultSelected?: CustomerRoleSlug[];
  onNext: (roles: CustomerRoleSlug[]) => void;
  onSaveAndContinueLater: (patch: { roleTypes: CustomerRoleSlug[] }) => void;
}

const OnboardingRole = ({
  defaultSelected = [],
  onNext,
  onSaveAndContinueLater,
  savingLater,
}: OnboardingRoleProps) => {
  const [selected, setSelected] = useState<CustomerRoleSlug[]>(defaultSelected);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        className={cn(bubbleStyle("Group_transparent_"), "max-w-xl w-full text-center space-y-8")}
      >
        <div className="space-y-3">
          <h1 className={cn(bubbleStyle("Text_heading_1_"), "text-3xl md:text-4xl leading-tight tracking-tight")}>
            How would you describe your current roles?
          </h1>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-base md:text-lg leading-relaxed max-w-md mx-auto")}>
            Select all that apply. This helps us make sure the questions feel relevant to your actual life.
          </p>
        </div>

        <CustomerRoleChipGroup
          selected={selected}
          onToggle={(slug) => setSelected((prev) => toggleCustomerRoleSelection(prev, slug))}
        />

        <div
          className="flex items-start gap-2 max-w-sm mx-auto rounded-lg bg-primary/5 px-3 py-2.5 text-left"
        >
          <p className={cn(bubbleStyle("Text_inter_13__400__white_copy_"), "text-xs text-muted-foreground")}>
            Tap cards to select your roles. You can update these later in your profile settings.
          </p>
        </div>

        <OnboardingStepActions
          onContinue={() => selected.length > 0 && onNext(selected)}
          continueDisabled={selected.length === 0}
          onSaveAndContinueLater={() => onSaveAndContinueLater({ roleTypes: selected })}
          savingLater={savingLater}
        />
      </div>
    </div>
  );
};

export default OnboardingRole;
