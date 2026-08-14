import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import OnboardingStepActions from "@/components/onboarding/OnboardingStepActions";
import type { OnboardingStepChromeProps } from "@/components/onboarding/OnboardingStepActions";
import {
  clearStoredJoinCode,
  isValidEnrollmentCodeFormat,
  normalizeEnrollmentCode,
  readStoredJoinCode,
} from "@/lib/workplace/enrollmentCodeFormat";
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
  const prefilled = useMemo(() => readStoredJoinCode(), []);
  const [code, setCode] = useState(prefilled ?? "");
  const [locked] = useState(Boolean(prefilled));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizedCode = normalizeEnrollmentCode(code);
  const canContinue = isValidEnrollmentCodeFormat(normalizedCode);

  useEffect(() => {
    if (!prefilled) return;
    // Auto-attempt redeem when arriving from /join/:code
    let cancelled = false;
    (async () => {
      setSubmitting(true);
      setError(null);
      try {
        await redeemWorkplaceEnrollmentCode(prefilled);
        clearStoredJoinCode();
        if (cancelled) return;
        onNext();
        void Promise.resolve(onEnrolled?.()).catch(() => undefined);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't redeem that code.");
        }
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount for join-link prefills
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await redeemWorkplaceEnrollmentCode(normalizedCode);
      clearStoredJoinCode();
      onNext();
      void Promise.resolve(onEnrolled?.()).catch(() => undefined);
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
            {locked
              ? "Confirming your workplace enrollment"
              : "Do you have a workplace enrollment code?"}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            {locked
              ? "Your join link included an enrollment code. We’re applying organization-covered access."
              : "If your employer provides Uncloud360, enter the code from HR to unlock organization-covered access. You can skip this step and add a code later in Settings → Profile."}
          </p>
        </div>

        <div className="mx-auto max-w-md space-y-2 text-left">
          <Label htmlFor="onboarding-workplace-code">Enrollment code</Label>
          <Input
            id="onboarding-workplace-code"
            placeholder="e.g. ACME26"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            readOnly={locked}
            onChange={(event) => {
              if (locked) return;
              setCode(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canContinue && !submitting && !locked) {
                void handleContinue();
              }
            }}
            className="h-12 text-base uppercase"
            autoFocus={!locked}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        {!locked ? (
          <OnboardingStepActions
            onContinue={() => void handleContinue()}
            continueDisabled={!canContinue || submitting}
            continueLabel={submitting ? "Verifying…" : "Continue"}
            savingLater={savingLater}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {submitting ? "Verifying…" : error ? "Fix the code with HR, or continue individually." : null}
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clearStoredJoinCode();
            onSkip();
          }}
          disabled={submitting || savingLater}
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingWorkplaceCode;
