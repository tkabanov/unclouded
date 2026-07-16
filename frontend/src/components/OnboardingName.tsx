import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface OnboardingNameValues {
  firstName: string;
  lastName: string;
}

interface OnboardingNameProps {
  onNext: (values: OnboardingNameValues) => void;
}

const OnboardingName = ({ onNext }: OnboardingNameProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const canContinue = trimmedFirstName.length > 0 && trimmedLastName.length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    onNext({ firstName: trimmedFirstName, lastName: trimmedLastName });
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

        <div className="pt-2">
          <Button
            variant="cta"
            size="lg"
            onClick={handleContinue}
            disabled={!canContinue}
            className="group"
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingName;
