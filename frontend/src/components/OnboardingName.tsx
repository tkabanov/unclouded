import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";

export interface OnboardingNameValues {
  firstName: string;
  lastName: string;
}

interface OnboardingNameProps extends OnboardingStepChromeProps {
  defaultFirstName?: string;
  defaultLastName?: string;
  onNext: (values: OnboardingNameValues) => void;
  onSaveAndContinueLater: (values: OnboardingNameValues) => void;
}

const OnboardingName = ({
  defaultFirstName = "",
  defaultLastName = "",
  onNext,
  onSaveAndContinueLater,
  savingLater,
}: OnboardingNameProps) => {
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const canContinue = trimmedFirstName.length > 0 && trimmedLastName.length > 0;
  const currentValues = { firstName: trimmedFirstName, lastName: trimmedLastName };

  const handleContinue = () => {
    if (!canContinue) return;
    onNext(currentValues);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full text-center space-y-8">
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          Step 1 of 12
        </p>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            What should we call you?
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            This is how your AI coach will address you throughout your sessions.
          </p>
        </div>

        <div className="mx-auto grid max-w-md gap-4 sm:grid-cols-2 text-left">
          <div className="space-y-2">
            <Label htmlFor="onboarding-first-name">First name</Label>
            <Input
              id="onboarding-first-name"
              placeholder="First name"
              value={firstName}
              autoComplete="given-name"
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) handleContinue();
              }}
              className="h-12 text-base"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onboarding-last-name">Last name</Label>
            <Input
              id="onboarding-last-name"
              placeholder="Last name"
              value={lastName}
              autoComplete="family-name"
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) handleContinue();
              }}
              className="h-12 text-base"
            />
          </div>
        </div>

        <OnboardingStepActions
          onContinue={handleContinue}
          continueDisabled={!canContinue}
          onSaveAndContinueLater={() => onSaveAndContinueLater(currentValues)}
          savingLater={savingLater}
        />
      </div>
    </div>
  );
};

export default OnboardingName;
