import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReassessmentFlow from "@/components/ReassessmentFlow";
import ReassessmentResultsReview from "@/components/reassessment/ReassessmentResultsReview";
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
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { ensureReferralCode } from "@/lib/share/referralCodeApi";
import { computeOnboardingModulePreview } from "@/lib/modules/moduleScheduler";
import {
  EMPTY_HEALTH_FLAGS,
  buildOnboardingDraftPayload,
  mergeOnboardingFormState,
  readOnboardingFormStateFromProfile,
  type OnboardingFormState,
} from "@/lib/onboardingProgress";
import { ONBOARDING_STEP, type OnboardingStepSlug } from "@/lib/enums/onboardingSteps";
import type { CustomerRoleSlug } from "@/lib/enums/customerProfile";
import { syncLegacyRoleType } from "@/lib/enums/customerRoleTypes";
import {
  ONBOARDING_WORKFLOW_EVENTS,
  advanceStep,
  canGoBack,
  retreatStep,
} from "@/lib/onboardingWizard";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import { isOnboardingComplete, resolvePostAuthRoute } from "@/lib/userProfile/onboardingStatus";

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    saveOnboarding,
    markOnboardingComplete,
    persistOnboardingDraft,
    refresh,
    profile,
    loading: profileLoading,
  } = useUserProfile();
  const [step, setStep] = useState<OnboardingStepSlug>(ONBOARDING_STEP.WELCOME);
  const [completingOnboarding, setCompletingOnboarding] = useState(false);
  const [savingLater, setSavingLater] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleTypes, setRoleTypes] = useState<CustomerRoleSlug[]>([]);
  const [primaryPillar, setPrimaryPillar] = useState("");
  const [stabilityScores, setStabilityScores] = useState<Record<string, number>>({});
  const [performanceScores, setPerformanceScores] = useState<Record<string, number>>({});
  const [alignmentScores, setAlignmentScores] = useState<Record<string, number>>({});
  const [orientationScore, setOrientationScore] = useState(0);
  const [loadSignals, setLoadSignals] = useState<Record<string, string>>({});
  const [stateSignals, setStateSignals] = useState<Record<string, string>>({});
  const [behavioralPatterns, setBehavioralPatterns] = useState<Record<string, string>>({});
  const [healthFlags, setHealthFlags] = useState(EMPTY_HEALTH_FLAGS);
  const [resultsAnchorDate] = useState(() => new Date());
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const onboardingStartedTracked = useRef(false);
  const hydratedFromProfile = useRef(false);

  const getFormState = useCallback(
    (): OnboardingFormState => ({
      firstName,
      lastName,
      roleTypes,
      primaryPillar,
      stabilityScores,
      performanceScores,
      alignmentScores,
      orientationScore,
      loadSignals,
      stateSignals,
      behavioralPatterns,
      healthFlags,
    }),
    [
      firstName,
      lastName,
      roleTypes,
      primaryPillar,
      stabilityScores,
      performanceScores,
      alignmentScores,
      orientationScore,
      loadSignals,
      stateSignals,
      behavioralPatterns,
      healthFlags,
    ],
  );

  const applyFormPatch = useCallback((patch: Partial<OnboardingFormState>) => {
    if (patch.firstName !== undefined) setFirstName(patch.firstName);
    if (patch.lastName !== undefined) setLastName(patch.lastName);
    if (patch.roleTypes !== undefined) setRoleTypes(patch.roleTypes);
    if (patch.primaryPillar !== undefined) setPrimaryPillar(patch.primaryPillar);
    if (patch.stabilityScores !== undefined) setStabilityScores(patch.stabilityScores);
    if (patch.performanceScores !== undefined) setPerformanceScores(patch.performanceScores);
    if (patch.alignmentScores !== undefined) setAlignmentScores(patch.alignmentScores);
    if (patch.orientationScore !== undefined) setOrientationScore(patch.orientationScore);
    if (patch.loadSignals !== undefined) setLoadSignals(patch.loadSignals);
    if (patch.stateSignals !== undefined) setStateSignals(patch.stateSignals);
    if (patch.behavioralPatterns !== undefined) setBehavioralPatterns(patch.behavioralPatterns);
    if (patch.healthFlags !== undefined) setHealthFlags(patch.healthFlags);
  }, []);

  const persistProgress = useCallback(
    async (resumeStep: OnboardingStepSlug, patch: Partial<OnboardingFormState> = {}) => {
      const merged = mergeOnboardingFormState(getFormState(), patch);
      applyFormPatch(patch);
      await persistOnboardingDraft(buildOnboardingDraftPayload(merged, resumeStep));
    },
    [applyFormPatch, getFormState, persistOnboardingDraft],
  );

  const completeStep = useCallback(
    async (completedStep: OnboardingStepSlug, patch: Partial<OnboardingFormState> = {}) => {
      const nextStep = advanceStep(completedStep);
      if (!nextStep) return;
      try {
        await persistProgress(nextStep, patch);
        setStep(nextStep);
      } catch (err) {
        console.error("Failed to persist onboarding step", err);
      }
    },
    [persistProgress],
  );

  const handleSaveAndContinueLater = useCallback(
    async (currentStep: OnboardingStepSlug, patch: Partial<OnboardingFormState> = {}) => {
      setSavingLater(true);
      try {
        await persistProgress(currentStep, patch);
        navigate("/dashboard");
      } catch (err) {
        console.error("Failed to save onboarding progress", err);
      } finally {
        setSavingLater(false);
      }
    },
    [navigate, persistProgress],
  );

  useEffect(() => {
    if (profileLoading || !user || onboardingStartedTracked.current) return;
    if (isOnboardingComplete(profile)) return;
    onboardingStartedTracked.current = true;
    trackProductEvent("onboarding_started");
  }, [profile, profileLoading, user]);

  const resultsModulePreview = useMemo(() => {
    if (step !== ONBOARDING_STEP.RESULTS) return undefined;
    return computeOnboardingModulePreview(
      {
        stabilityScores,
        performanceScores,
        alignmentScores,
        loadSignals,
        stateSignals,
        behavioralPatterns,
        healthFlags,
      },
      resultsAnchorDate,
      resultsAnchorDate,
    ).preview;
  }, [
    step,
    resultsAnchorDate,
    stabilityScores,
    performanceScores,
    alignmentScores,
    loadSignals,
    stateSignals,
    behavioralPatterns,
    healthFlags,
  ]);

  useEffect(() => {
    if (profileLoading || !profile || hydratedFromProfile.current) return;
    if (isOnboardingComplete(profile)) return;

    const { form, resumeStep } = readOnboardingFormStateFromProfile(profile);
    hydratedFromProfile.current = true;
    applyFormPatch(form);
    if (resumeStep) {
      setStep(resumeStep);
    }
  }, [applyFormPatch, profile, profileLoading]);

  /** Bubble workflow bTHIw (`previous_step`): retreat onboarding_step_os by one. */
  const goBack = useCallback(() => {
    const prev = retreatStep(step);
    if (prev) setStep(prev);
  }, [step]);

  useEffect(() => {
    if (profileLoading || completingOnboarding || searchParams.get("reassessment") === "1") return;
    if (isOnboardingComplete(profile)) {
      navigate(resolvePostAuthRoute(profile), { replace: true });
    }
  }, [profile, profileLoading, completingOnboarding, navigate, searchParams]);

  useEffect(() => {
    if (step !== ONBOARDING_STEP.RESULTS || !user) return;

    let cancelled = false;
    ensureReferralCode(user.id)
      .then((code) => {
        if (!cancelled) setReferralCode(code);
      })
      .catch((error) => {
        console.error("Failed to ensure referral code for share card", error);
      });

    return () => {
      cancelled = true;
    };
  }, [step, user]);

  const handleComplete = async () => {
    if (!user) {
      console.error("Failed to complete onboarding: not authenticated");
      return;
    }
    setCompletingOnboarding(true);
    try {
      await completeOnboarding(
        {
          firstName,
          lastName,
          roleTypes,
          roleType: syncLegacyRoleType(roleTypes) ?? "",
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
        {
          userId: user.id,
          userEmail: user.email ?? undefined,
          saveOnboarding,
          markOnboardingComplete,
          refreshProfile: refresh,
          navigate,
          anchorDate: resultsAnchorDate,
        }
      );
    } catch (err) {
      console.error("Failed to complete onboarding", err);
    } finally {
      setCompletingOnboarding(false);
    }
  };

  
  const renderStep = () => {
    switch (step) {
      case ONBOARDING_STEP.WELCOME:
        return (
          <OnboardingWelcome
            onNext={() => void completeStep(ONBOARDING_STEP.WELCOME)}
            onSkip={() => navigate("/dashboard")}
          />
        );
      case ONBOARDING_STEP.NAME:
        return (
          <OnboardingName
            defaultFirstName={firstName}
            defaultLastName={lastName}
            onNext={({ firstName: nextFirstName, lastName: nextLastName }) =>
              void completeStep(ONBOARDING_STEP.NAME, {
                firstName: nextFirstName,
                lastName: nextLastName,
              })
            }
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.NAME, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.ROLE:
        return (
          <OnboardingRole
            defaultSelected={roleTypes}
            onNext={(roles) => void completeStep(ONBOARDING_STEP.ROLE, { roleTypes: roles })}
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.ROLE, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.PILLAR:
        return (
          <OnboardingPillar
            firstName={firstName}
            defaultSelected={primaryPillar || null}
            onNext={(pillar) => void completeStep(ONBOARDING_STEP.PILLAR, { primaryPillar: pillar })}
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.PILLAR, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.STABILITY:
        return (
          <OnboardingStability
            defaultAnswers={stabilityScores}
            onNext={(scores) => void completeStep(ONBOARDING_STEP.STABILITY, { stabilityScores: scores })}
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.STABILITY, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.PERFORMANCE:
        return (
          <OnboardingPerformance
            roles={roleTypes}
            defaultAnswers={performanceScores}
            onNext={(scores) =>
              void completeStep(ONBOARDING_STEP.PERFORMANCE, { performanceScores: scores })
            }
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.PERFORMANCE, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.ALIGNMENT:
        return (
          <OnboardingAlignment
            defaultAnswers={alignmentScores}
            onNext={(scores) => void completeStep(ONBOARDING_STEP.ALIGNMENT, { alignmentScores: scores })}
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.ALIGNMENT, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.ORIENTATION:
        return (
          <OnboardingOrientation
            defaultSelected={orientationScore > 0 ? orientationScore : null}
            onNext={(score) => void completeStep(ONBOARDING_STEP.ORIENTATION, { orientationScore: score })}
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.ORIENTATION, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.LOAD_SIGNALS:
        return (
          <OnboardingLoadSignals
            firstName={firstName}
            defaultAnswers={loadSignals}
            onNext={(signals) => void completeStep(ONBOARDING_STEP.LOAD_SIGNALS, { loadSignals: signals })}
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.LOAD_SIGNALS, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.STATE_SIGNALS:
        return (
          <OnboardingStateSignals
            firstName={firstName}
            defaultAnswers={stateSignals}
            onNext={(signals) => void completeStep(ONBOARDING_STEP.STATE_SIGNALS, { stateSignals: signals })}
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.STATE_SIGNALS, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.BEHAVIORAL_PATTERN:
        return (
          <OnboardingBehavioral
            firstName={firstName}
            defaultAnswers={behavioralPatterns}
            onNext={(data) =>
              void completeStep(ONBOARDING_STEP.BEHAVIORAL_PATTERN, { behavioralPatterns: data })
            }
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.BEHAVIORAL_PATTERN, patch)
            }
            savingLater={savingLater}
          />
        );
      case ONBOARDING_STEP.HEALTH_WELLNESS_FLAGS:
        return (
          <OnboardingHealthFlags
            defaultSelected={healthFlags.selected_flags}
            onNext={(data) =>
              void completeStep(ONBOARDING_STEP.HEALTH_WELLNESS_FLAGS, { healthFlags: data })
            }
            onSaveAndContinueLater={(patch) =>
              void handleSaveAndContinueLater(ONBOARDING_STEP.HEALTH_WELLNESS_FLAGS, patch)
            }
            savingLater={savingLater}
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
            modulePreview={resultsModulePreview}
            referralCode={referralCode}
            onComplete={handleComplete}
            onSaveAndContinueLater={() => handleSaveAndContinueLater(ONBOARDING_STEP.RESULTS)}
            savingLater={savingLater}
          />
        );
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  };

  if (searchParams.get("reassessment") === "results") {
    return <ReassessmentResultsReview />;
  }

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
