import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReassessmentFlow from "@/components/ReassessmentFlow";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import OnboardingName from "@/components/OnboardingName";
import OnboardingRole from "@/components/OnboardingRole";
import OnboardingPillar from "@/components/OnboardingPillar";
import OnboardingStability from "@/components/OnboardingStability";
import OnboardingPerformance from "@/components/OnboardingPerformance";
import OnboardingAlignment from "@/components/OnboardingAlignment";
import OnboardingOrientation from "@/components/OnboardingOrientation";
import OnboardingLoadSignals from "@/components/OnboardingLoadSignals";
import OnboardingStateSignals from "@/components/OnboardingStateSignals";
import OnboardingBehavioral from "@/components/OnboardingBehavioral";
import OnboardingHealthFlags from "@/components/OnboardingHealthFlags";
import OnboardingResults from "@/components/OnboardingResults";
import OnboardingWizardShell from "@/components/OnboardingWizardShell";
import { completeOnboarding } from "@/lib/completeOnboarding";
import {
  buildLoadSignalCustomStates,
  type HealthFlagsPayload,
} from "@/lib/enums/onboardingQuestions";
import { ONBOARDING_STEP, type OnboardingStepSlug } from "@/lib/enums/onboardingSteps";
import {
  ONBOARDING_WORKFLOW_EVENTS,
  advanceStep,
  canGoBack,
  retreatStep,
} from "@/lib/onboardingWizard";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import { isOnboardingComplete } from "@/lib/userProfile/onboardingStatus";

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { saveOnboarding, persistOnboardingDraft, refresh, profile, loading: profileLoading } = useUserProfile();
  const [step, setStep] = useState<OnboardingStepSlug>(ONBOARDING_STEP.WELCOME);
  const [firstName, setFirstName] = useState("");
  const [roleType, setRoleType] = useState("");
  const [primaryPillar, setPrimaryPillar] = useState("");
  const [stabilityScores, setStabilityScores] = useState<Record<string, number>>({});
  const [performanceScores, setPerformanceScores] = useState<Record<string, number>>({});
  const [alignmentScores, setAlignmentScores] = useState<Record<string, number>>({});
  const [orientationScore, setOrientationScore] = useState(0);
  const [loadSignals, setLoadSignals] = useState<Record<string, string>>({});
  const [stateSignals, setStateSignals] = useState<Record<string, string>>({});
  const [behavioralPatterns, setBehavioralPatterns] = useState<Record<string, string>>({});
  const [healthFlags, setHealthFlags] = useState<HealthFlagsPayload>({
    recovery_mode_active: false,
    grief_mode_active: false,
    health_flag3: false,
    health_flag4: false,
    health_flag5: false,
    health_flag6: false,
    health_none_of_the_above: false,
    selected_flags: [],
  });

  const buildOnboardingData = useCallback(
    (overrides: Record<string, unknown> = {}) => ({
      stabilityScores,
      performanceScores,
      alignmentScores,
      orientationScore,
      loadSignals,
      stateSignals,
      behavioralPatterns,
      healthFlags,
      ...overrides,
    }),
    [
      stabilityScores,
      performanceScores,
      alignmentScores,
      orientationScore,
      loadSignals,
      stateSignals,
      behavioralPatterns,
      healthFlags,
    ]
  );

  /** Bubble workflow bTHIT (`next_step`): ChangeThing then advance onboarding_step_os. */
  const goNext = useCallback((from: OnboardingStepSlug = step) => {
    const next = advanceStep(from);
    if (next) setStep(next);
  }, [step]);

  /** Bubble workflow bTHIw (`previous_step`): retreat onboarding_step_os by one. */
  const goBack = useCallback(() => {
    const prev = retreatStep(step);
    if (prev) setStep(prev);
  }, [step]);

  useEffect(() => {
    if (profileLoading || searchParams.get("reassessment") === "1") return;
    if (isOnboardingComplete(profile)) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, profileLoading, navigate, searchParams]);

  const handleComplete = async () => {
    if (!user) {
      console.error("Failed to complete onboarding: not authenticated");
      return;
    }
    try {
      await completeOnboarding(
        {
          firstName,
          roleType,
          primaryPillar,
          stabilityScores,
          performanceScores,
          alignmentScores,
          orientationScore,
          loadSignals,
          stateSignals,
          behavioralPatterns,
          healthFlags,
        },
        { userId: user.id, userEmail: user.email ?? undefined, saveOnboarding, refreshProfile: refresh, navigate }
      );
    } catch (err) {
      console.error("Failed to complete onboarding", err);
    }
  };

  
  const renderStep = () => {
    switch (step) {
      case ONBOARDING_STEP.WELCOME:
        return (
          <OnboardingWelcome onNext={() => goNext(ONBOARDING_STEP.WELCOME)} />
        );
      case ONBOARDING_STEP.NAME:
        return (
          <OnboardingName
            onNext={(name) => {
              setFirstName(name);
              goNext(ONBOARDING_STEP.NAME);
            }}
          />
        );
      case ONBOARDING_STEP.ROLE:
        return (
          <OnboardingRole
            onNext={async (role) => {
              setRoleType(role);
              try {
                await persistOnboardingDraft({
                  roleType: role,
                  onboardingData: buildOnboardingData({ roleType: role }),
                });
              } catch (err) {
                console.error("Failed to persist role selection", err);
              }
              goNext(ONBOARDING_STEP.ROLE);
            }}
          />
        );
      case ONBOARDING_STEP.PILLAR:
        return (
          <OnboardingPillar
            firstName={firstName}
            onNext={async (pillar) => {
              setPrimaryPillar(pillar);
              try {
                await persistOnboardingDraft({
                  primaryPillar: pillar,
                  onboardingData: buildOnboardingData({ primaryPillar: pillar }),
                });
              } catch (err) {
                console.error("Failed to persist pillar selection", err);
              }
              goNext(ONBOARDING_STEP.PILLAR);
            }}
          />
        );
      case ONBOARDING_STEP.STABILITY:
        return (
          <OnboardingStability
            onNext={(scores) => {
              setStabilityScores(scores);
              goNext(ONBOARDING_STEP.STABILITY);
            }}
          />
        );
      case ONBOARDING_STEP.PERFORMANCE:
        return (
          <OnboardingPerformance
            role={roleType}
            onNext={async (scores) => {
              setPerformanceScores(scores);
              try {
                await persistOnboardingDraft({
                  onboardingData: buildOnboardingData({ performanceScores: scores }),
                });
              } catch (err) {
                console.error("Failed to persist performance answers", err);
              }
              goNext(ONBOARDING_STEP.PERFORMANCE);
            }}
          />
        );
      case ONBOARDING_STEP.ALIGNMENT:
        return (
          <OnboardingAlignment
            onNext={(scores) => {
              setAlignmentScores(scores);
              goNext(ONBOARDING_STEP.ALIGNMENT);
            }}
          />
        );
      case ONBOARDING_STEP.ORIENTATION:
        return (
          <OnboardingOrientation
            onNext={async (score) => {
              setOrientationScore(score);
              try {
                await persistOnboardingDraft({
                  onboardingData: buildOnboardingData({ orientationScore: score }),
                });
              } catch (err) {
                console.error("Failed to persist orientation answer", err);
              }
              goNext(ONBOARDING_STEP.ORIENTATION);
            }}
          />
        );
      case ONBOARDING_STEP.LOAD_SIGNALS:
        return (
          <OnboardingLoadSignals
            firstName={firstName}
            onNext={async (signals) => {
              setLoadSignals(signals);
              try {
                await persistOnboardingDraft({
                  onboardingData: buildOnboardingData({
                    loadSignals: signals,
                    loadSignalCustomStates: buildLoadSignalCustomStates(signals),
                  }),
                });
              } catch (err) {
                console.error("Failed to persist load signals", err);
              }
              goNext(ONBOARDING_STEP.LOAD_SIGNALS);
            }}
          />
        );
      case ONBOARDING_STEP.STATE_SIGNALS:
        return (
          <OnboardingStateSignals
            firstName={firstName}
            onNext={(signals) => {
              setStateSignals(signals);
              goNext(ONBOARDING_STEP.STATE_SIGNALS);
            }}
          />
        );
      case ONBOARDING_STEP.BEHAVIORAL_PATTERN:
        return (
          <OnboardingBehavioral
            firstName={firstName}
            onNext={(data) => {
              setBehavioralPatterns(data);
              goNext(ONBOARDING_STEP.BEHAVIORAL_PATTERN);
            }}
          />
        );
      case ONBOARDING_STEP.HEALTH_WELLNESS_FLAGS:
        return (
          <OnboardingHealthFlags
            onNext={async (data) => {
              setHealthFlags(data);
              try {
                await persistOnboardingDraft({
                  onboardingData: buildOnboardingData({ healthFlags: data }),
                });
              } catch (err) {
                console.error("Failed to persist health flags", err);
              }
              goNext(ONBOARDING_STEP.HEALTH_WELLNESS_FLAGS);
            }}
          />
        );
      case ONBOARDING_STEP.RESULTS:
        return (
          <OnboardingResults
            firstName={firstName}
            stabilityScores={stabilityScores}
            performanceScores={performanceScores}
            alignmentScores={alignmentScores}
            orientationScore={orientationScore}
            loadSignals={loadSignals}
            stateSignals={stateSignals}
            behavioralPatterns={behavioralPatterns}
            healthFlags={healthFlags}
            onComplete={handleComplete}
          />
        );
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  };

  if (searchParams.get("reassessment") === "1") {
    return <ReassessmentFlow />;
  }

  return (
    <OnboardingWizardShell
      step={step}
      firstName={firstName}
      onBack={canGoBack(step) ? goBack : undefined}
    >
      <div
        data-onboarding-step={step}
        data-workflow-next={ONBOARDING_WORKFLOW_EVENTS.NEXT_STEP}
        data-workflow-back={ONBOARDING_WORKFLOW_EVENTS.PREVIOUS_STEP}
        className="flex flex-1 flex-col"
      >
        {renderStep()}
      </div>
    </OnboardingWizardShell>
  );
};

export default Onboarding;
