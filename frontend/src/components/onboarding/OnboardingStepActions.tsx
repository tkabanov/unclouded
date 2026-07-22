import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface OnboardingStepChromeProps {
  onSaveAndContinueLater?: () => void | Promise<void>;
  savingLater?: boolean;
}

interface OnboardingStepActionsProps extends OnboardingStepChromeProps {
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  className?: string;
  buttonClassName?: string;
}

const OnboardingStepActions = ({
  onContinue,
  continueDisabled = false,
  continueLabel = "Continue",
  onSaveAndContinueLater,
  savingLater = false,
  className,
  buttonClassName,
}: OnboardingStepActionsProps) => (
  <div className={cn("flex flex-col items-center gap-3 pt-2", className)}>
    <Button
      variant="cta"
      size="lg"
      onClick={onContinue}
      disabled={continueDisabled || savingLater}
      className={cn(bubbleStyle("Button_primary_"), "group", buttonClassName)}
    >
      {continueLabel}
      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
    </Button>
    {onSaveAndContinueLater ? (
      <Button
        type="button"
        variant="ghost"
        onClick={() => void onSaveAndContinueLater()}
        disabled={savingLater}
      >
        {savingLater ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          "Save and Continue Later"
        )}
      </Button>
    ) : null}
  </div>
);

export default OnboardingStepActions;
