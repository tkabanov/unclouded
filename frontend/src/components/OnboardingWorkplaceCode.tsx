import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";
import { redeemWorkplaceEnrollmentCode } from "@/lib/workplace/workplaceEnrollmentApi";

interface OnboardingWorkplaceCodeProps extends OnboardingStepChromeProps {
  onNext: () => void;
  onSkip: () => void;
  onEnrolled?: () => void | Promise<void>;
}

const OnboardingWorkplaceCode = ({
  onNext,
  onSkip,
  onEnrolled,
  savingLater,
}: OnboardingWorkplaceCodeProps) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedCode = code.trim();
  const canContinue = trimmedCode.length >= 6;

  const handleContinue = async () => {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await redeemWorkplaceEnrollmentCode(trimmedCode);
      await onEnrolled?.();
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't redeem that code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            Do you have a workplace enrollment code?
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            If your employer provides Uncloud360, enter the code from HR to unlock organization-covered
            access. You can skip this step and add a code later.
          </p>
        </div>

        <div className="mx-auto max-w-md space-y-2 text-left">
          <Label htmlFor="onboarding-workplace-code">Enrollment code</Label>
          <Input
            id="onboarding-workplace-code"
            placeholder="e.g. ACME-2026-ABCD"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canContinue && !submitting) {
                void handleContinue();
              }
            }}
            className="h-12 text-base uppercase"
            autoFocus
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <OnboardingStepActions
          onContinue={() => void handleContinue()}
          continueDisabled={!canContinue || submitting}
          continueLabel={submitting ? "Verifying…" : "Continue"}
          savingLater={savingLater}
        />

        <Button type="button" variant="ghost" onClick={onSkip} disabled={submitting || savingLater}>
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingWorkplaceCode;
