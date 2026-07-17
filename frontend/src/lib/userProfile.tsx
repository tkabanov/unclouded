import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { classifications, type ResultsData } from "./classification";
import type { ReflectionAnswers } from "./reassessment";
import {
  completeReassessment,
  type CompleteReassessmentResult,
} from "@/lib/reassessment/completeReassessment";
import { addNinetyDaysIso } from "@/lib/reassessment/reassessmentEntitlements";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserProfile {
  firstName: string;
  roleType: string;
  primaryPillar: string;
  results: ResultsData | null;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  onboardingData: Record<string, unknown> | null;
  subscribed: boolean;
  tier: string | null;
  lastAssessmentDate: string | null;
  nextReassessmentDate: string | null;
  canReassessOnDemand: boolean;
  reassessmentResults: ResultsData | null;
  reassessmentReflections: ReflectionAnswers | null;
  reassessmentCompletedAt: string | null;
  modulesCompletedCount?: number;
  moduleSchedules?: Record<string, unknown> | null;
  moduleIdentityComplete?: boolean;
  moduleRelationalComplete?: boolean;
  moduleHistoryComplete?: boolean;
  moduleFinancialComplete?: boolean;
  moduleBodyComplete?: boolean;
  moduleMeaningComplete?: boolean;
}

export interface OnboardingPayload {
  firstName: string;
  lastName: string;
  roleType: string;
  primaryPillar: string;
  results: ResultsData;
  onboardingData: Record<string, unknown>;
  modulesCompletedCount?: number;
  moduleSchedules?: Record<string, unknown>;
}

export interface SaveOnboardingOptions {
  /** When false, keeps onboardingCompleted false until markOnboardingComplete runs. */
  markComplete?: boolean;
  /** When false, skips reloading profile context (avoids premature dashboard redirect). */
  refresh?: boolean;
}

export interface OnboardingDraftPayload {
  firstName?: string;
  lastName?: string;
  roleType?: string;
  primaryPillar?: string;
  onboardingData?: Record<string, unknown>;
}

export interface ReassessmentPayload {
  results: ResultsData;
  /** Baseline scores captured at flow start (before promote). */
  firstResults?: ResultsData;
  reassessmentData: Record<string, unknown>;
  reflections: ReflectionAnswers;
  pathAdaptiveQ?: string | null;
  pathAdaptiveAnswer?: string | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  saveOnboarding: (payload: OnboardingPayload, options?: SaveOnboardingOptions) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  persistOnboardingDraft: (payload: OnboardingDraftPayload) => Promise<void>;
  saveReassessment: (payload: ReassessmentPayload) => Promise<CompleteReassessmentResult>;
  simulate90DaysElapsed: () => Promise<void>;
  loadDemoComparison: () => Promise<void>;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const PROFILE_SELECT =
  "firstName, roleType, primaryPillar, results, onboardingCompleted, onboardingCompletedAt, onboardingData, subscribed, tier, lastAssessmentDate, nextReassessmentDate, canReassessOnDemand, reassessmentResults, reassessmentReflections, reassessmentCompletedAt, modulesCompletedCount, moduleSchedules, moduleIdentityComplete, moduleRelationalComplete, moduleHistoryComplete, moduleFinancialComplete, moduleBodyComplete, moduleMeaningComplete";

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setProfileState(null);
      setLoading(false);
      return;
    }
    if (!options?.silent) {
      setLoading(true);
    }
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      if (!options?.silent) {
        setProfileState(null);
      }
    } else if (data) {
      setProfileState({
        firstName: data.firstName ?? "",
        roleType: data.roleType ?? "",
        primaryPillar: data.primaryPillar ?? "",
        results: (data.results as unknown as ResultsData | null) ?? null,
        onboardingCompleted: data.onboardingCompleted ?? false,
        onboardingCompletedAt: data.onboardingCompletedAt ?? null,
        onboardingData:
          (data.onboardingData as unknown as Record<string, unknown> | null) ?? null,
        subscribed: data.subscribed ?? false,
        tier: data.tier ?? null,
        lastAssessmentDate: data.lastAssessmentDate ?? null,
        nextReassessmentDate: data.nextReassessmentDate ?? null,
        canReassessOnDemand: data.canReassessOnDemand ?? false,
        reassessmentResults:
          (data.reassessmentResults as unknown as ResultsData | null) ?? null,
        reassessmentReflections:
          (data.reassessmentReflections as unknown as ReflectionAnswers | null) ?? null,
        reassessmentCompletedAt: data.reassessmentCompletedAt ?? null,
        modulesCompletedCount: data.modulesCompletedCount ?? undefined,
        moduleSchedules: (data.moduleSchedules as unknown as Record<string, unknown> | null) ?? null,
        moduleIdentityComplete: data.moduleIdentityComplete ?? undefined,
        moduleRelationalComplete: data.moduleRelationalComplete ?? undefined,
        moduleHistoryComplete: data.moduleHistoryComplete ?? undefined,
        moduleFinancialComplete: data.moduleFinancialComplete ?? undefined,
        moduleBodyComplete: data.moduleBodyComplete ?? undefined,
        moduleMeaningComplete: data.moduleMeaningComplete ?? undefined,
      });
    } else {
      setProfileState(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    loadProfile();
  }, [authLoading, loadProfile]);

  const saveOnboarding = useCallback(
    async (payload: OnboardingPayload, options?: SaveOnboardingOptions) => {
      if (!user) throw new Error("Not authenticated");
      const markComplete = options?.markComplete ?? true;
      const refresh = options?.refresh ?? true;
      const completedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? null,
            firstName: payload.firstName,
            lastName: payload.lastName,
            roleType: payload.roleType,
            primaryPillar: payload.primaryPillar,
            results: payload.results as unknown as never,
            onboardingData: payload.onboardingData as unknown as never,
            modulesCompletedCount: payload.modulesCompletedCount,
            moduleSchedules: payload.moduleSchedules as unknown as never,
            onboardingCompleted: markComplete,
            onboardingCompletedAt: markComplete ? completedAt : null,
            lastAssessmentDate: markComplete ? completedAt : null,
            nextReassessmentDate: markComplete ? addNinetyDaysIso(completedAt) : null,
          },
          { onConflict: "id" },
        )
        .select("id")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to persist onboarding profile");
      if (refresh) {
        await loadProfile();
      }
    },
    [user, loadProfile]
  );

  const markOnboardingComplete = useCallback(async () => {
    if (!user) throw new Error("Not authenticated");
    const completedAt = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        onboardingCompleted: true,
        onboardingCompletedAt: completedAt,
        lastAssessmentDate: completedAt,
        nextReassessmentDate: addNinetyDaysIso(completedAt),
      })
      .eq("id", user.id);

    if (error) throw error;
    await loadProfile();
  }, [user, loadProfile]);

  const persistOnboardingDraft = useCallback(
    async (payload: OnboardingDraftPayload) => {
      if (!user) return;

      const updates: Record<string, unknown> = {};
      if (payload.firstName !== undefined) updates.firstName = payload.firstName;
      if (payload.lastName !== undefined) updates.lastName = payload.lastName;
      if (payload.roleType !== undefined) updates.roleType = payload.roleType;
      if (payload.primaryPillar !== undefined) updates.primaryPillar = payload.primaryPillar;
      if (payload.onboardingData !== undefined) {
        const existing = profile?.onboardingData ?? {};
        updates.onboardingData = {
          ...existing,
          ...payload.onboardingData,
        } as unknown as never;
      }

      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (error) throw error;
      await loadProfile({ silent: true });
    },
    [user, loadProfile, profile?.onboardingData]
  );

  const saveReassessment = useCallback(
    async (payload: ReassessmentPayload) => {
      if (!user) throw new Error("Not authenticated");
      if (!profile?.results) throw new Error("No prior assessment results");

      const tier = resolveCurrentTier(profile.subscribed, profile.tier);
      const result = await completeReassessment({
        userId: user.id,
        tier,
        firstResults: payload.firstResults ?? profile.results,
        secondResults: payload.results,
        reflections: payload.reflections,
        reassessmentData: payload.reassessmentData,
        pathAdaptiveQ: payload.pathAdaptiveQ,
        pathAdaptiveAnswer: payload.pathAdaptiveAnswer,
        primaryPillar: profile.primaryPillar,
      });

      await loadProfile({ silent: true });
      return result;
    },
    [user, loadProfile, profile]
  );

  const simulate90DaysElapsed = useCallback(async () => {
    if (!user) throw new Error("Not authenticated");
    const backdated = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        onboardingCompletedAt: backdated,
        lastAssessmentDate: backdated,
        nextReassessmentDate: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) throw error;
    await loadProfile();
  }, [user, loadProfile]);

  // Demo helper: instantly populate BOTH a first assessment and a completed
  // 90-day reassessment (with improved scores + reflections) so the Day 0 vs
  // Day 90 comparison can be reviewed without going through both flows.
  const loadDemoComparison = useCallback(async () => {
    if (!user) throw new Error("Not authenticated");

    const firstResults: ResultsData = profile?.results ?? {
      stability_score: 2.4,
      performance_score: 2.8,
      alignment_score: 2.6,
      orientation_score: 2.5,
      pressure_profile: "System Overload",
      tradeoff_statement:
        "You're carrying more than the system can sustain right now — the priority is stabilization, not optimization.",
      classification: classifications.capacity_erosion,
      recovery_mode_active: false,
      grief_mode_active: false,
      trauma_informed_mode: false,
      first_module: "Hard Seasons",
      module_days: 42,
    };

    const bump = (v: number) => Math.min(5, Math.round((v + 0.9) * 10) / 10);
    const secondResults: ResultsData = {
      ...firstResults,
      stability_score: bump(firstResults.stability_score),
      performance_score: bump(firstResults.performance_score),
      alignment_score: bump(firstResults.alignment_score),
      orientation_score: bump(firstResults.orientation_score),
      pressure_profile: "Sustainable Load",
      tradeoff_statement:
        "You've rebuilt real capacity — the foundation is steadier and you can start building on it again.",
      classification: classifications.building_momentum,
    };

    const reflections: ReflectionAnswers = {
      reflection_q1:
        "I'm sleeping better and I bounce back from small setbacks much faster than before.",
      reflection_q2: "Evenings still feel heavy and winding down takes longer than I'd like.",
      reflection_q3: "I set a boundary at work and actually held it for the whole quarter.",
      reflection_q4: "Building a consistent morning routine and following through on it.",
    };

    const backdated = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        firstName: profile?.firstName || "there",
        results: firstResults as unknown as never,
        onboardingCompleted: true,
        onboardingCompletedAt: backdated,
        lastAssessmentDate: backdated,
        nextReassessmentDate: nowIso,
        reassessmentResults: secondResults as unknown as never,
        reassessmentReflections: reflections as unknown as never,
        reassessmentCompletedAt: nowIso,
      })
      .eq("id", user.id);
    if (error) throw error;
    await loadProfile();
  }, [user, loadProfile, profile]);

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        loading,
        saveOnboarding,
        markOnboardingComplete,
        persistOnboardingDraft,
        saveReassessment,
        simulate90DaysElapsed,
        loadDemoComparison,
        refresh: loadProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProfileProvider");
  return ctx;
}
