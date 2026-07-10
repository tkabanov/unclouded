import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CrisisBar from "@/components/CrisisBar";
import type { OnboardingStepSlug } from "@/lib/enums/onboardingSteps";
import {
  ONBOARDING_SCORED_STEP_COUNT,
  getStepDisplayNumber,
  showsWizardChrome,
} from "@/lib/onboardingWizard";

interface OnboardingWizardShellProps {
  step: OnboardingStepSlug;
  firstName?: string;
  onBack?: () => void;
  children: ReactNode;
}

const OnboardingWizardShell = ({
  step,
  firstName,
  onBack,
  children,
}: OnboardingWizardShellProps) => {
  const displayNumber = getStepDisplayNumber(step);
  const showChrome = showsWizardChrome(step);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div>
        <CrisisBar />
      </div>
      <div className="flex flex-1 flex-col">
        {showChrome && (
          <header className="border-b border-border/60 bg-background/95 px-4 py-3">
            <div className="mx-auto flex max-w-2xl items-center gap-4">
              {onBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="shrink-0 gap-1.5 text-muted-foreground"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <span className="w-[72px] shrink-0" aria-hidden />
              )}

              <div className="min-w-0 flex-1 space-y-0.5 text-center">
                <div className="truncate text-sm font-medium text-foreground">
                  {firstName ? `Hi, ${firstName}` : "\u00a0"}
                </div>
                <div className="space-y-0.5">
                  {displayNumber !== null && (
                    <p
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Step {displayNumber} of {ONBOARDING_SCORED_STEP_COUNT}
                    </p>
                  )}
                </div>
              </div>

              <span className="w-[72px] shrink-0" aria-hidden />
            </div>
          </header>
        )}

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
};

export default OnboardingWizardShell;
