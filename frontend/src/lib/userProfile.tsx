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
  reassessmentResults: ResultsData | null;
  reassessmentReflections: ReflectionAnswers | null;
  reassessmentCompletedAt: string | null;
}

export interface OnboardingPayload {
  firstName: string;
  roleType: string;
  primaryPillar: string;
  results: ResultsData;
  onboardingData: Record<string, unknown>;
}

export interface OnboardingDraftPayload {
  firstName?: string;
  roleType?: string;
  primaryPillar?: string;
  onboardingData?: Record<string, unknown>;
}

export interface ReassessmentPayload {
  results: ResultsData;
  reassessmentData: Record<string, unknown>;
  reflections: ReflectionAnswers;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  saveOnboarding: (payload: OnboardingPayload) => Promise<void>;
  persistOnboardingDraft: (payload: OnboardingDraftPayload) => Promise<void>;
  saveReassessment: (payload: ReassessmentPayload) => Promise<void>;
  setSubscribed: (subscribed: boolean) => Promise<void>;
  simulate90DaysElapsed: () => Promise<void>;
  loadDemoComparison: () => Promise<void>;
  refresh: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfileState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "first_name, role_type, primary_pillar, results, onboarding_completed, onboarding_completed_at, onboarding_data, subscribed, reassessment_results, reassessment_reflections, reassessment_completed_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfileState(null);
    } else if (data) {
      setProfileState({
        firstName: data.first_name ?? "",
        roleType: data.role_type ?? "",
        primaryPillar: data.primary_pillar ?? "",
        results: (data.results as unknown as ResultsData | null) ?? null,
        onboardingCompleted: data.onboarding_completed ?? false,
        onboardingCompletedAt: data.onboarding_completed_at ?? null,
        onboardingData:
          (data.onboarding_data as unknown as Record<string, unknown> | null) ?? null,
        subscribed: data.subscribed ?? false,
        reassessmentResults:
          (data.reassessment_results as unknown as ResultsData | null) ?? null,
        reassessmentReflections:
          (data.reassessment_reflections as unknown as ReflectionAnswers | null) ?? null,
        reassessmentCompletedAt: data.reassessment_completed_at ?? null,
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
    async (payload: OnboardingPayload) => {
      if (!user) throw new Error("Not authenticated");
      const completedAt = new Date().toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: payload.firstName,
          role_type: payload.roleType,
          primary_pillar: payload.primaryPillar,
          results: payload.results as unknown as never,
          onboarding_data: payload.onboardingData as unknown as never,
          onboarding_completed: true,
          onboarding_completed_at: completedAt,
        })
        .eq("id", user.id);

      if (error) throw error;
      await loadProfile();
    },
    [user, loadProfile]
  );

  const persistOnboardingDraft = useCallback(
    async (payload: OnboardingDraftPayload) => {
      if (!user) return;

      const updates: Record<string, unknown> = {};
      if (payload.firstName !== undefined) updates.first_name = payload.firstName;
      if (payload.roleType !== undefined) updates.role_type = payload.roleType;
      if (payload.primaryPillar !== undefined) updates.primary_pillar = payload.primaryPillar;
      if (payload.onboardingData !== undefined) {
        const existing = profile?.onboardingData ?? {};
        updates.onboarding_data = {
          ...existing,
          ...payload.onboardingData,
        } as unknown as never;
      }

      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (error) throw error;
      await loadProfile();
    },
    [user, loadProfile, profile?.onboardingData]
  );

  const saveReassessment = useCallback(
    async (payload: ReassessmentPayload) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({
          reassessment_results: payload.results as unknown as never,
          reassessment_data: payload.reassessmentData as unknown as never,
          reassessment_reflections: payload.reflections as unknown as never,
          reassessment_completed_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      await loadProfile();
    },
    [user, loadProfile]
  );

  const setSubscribed = useCallback(
    async (subscribed: boolean) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ subscribed })
        .eq("id", user.id);
      if (error) throw error;
      await loadProfile();
    },
    [user, loadProfile]
  );

  // Demo helper: back-date the first assessment by 90+ days so the
  // reassessment becomes available immediately for review.
  const simulate90DaysElapsed = useCallback(async () => {
    if (!user) throw new Error("Not authenticated");
    const backdated = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: backdated })
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
      whats_different:
        "I'm sleeping better and I bounce back from small setbacks much faster than before.",
      proud_of: "I set a boundary at work and actually held it for the whole quarter.",
      still_hard: "Evenings still feel heavy and winding down takes longer than I'd like.",
      focus_next: "Building a consistent morning routine and following through on it.",
    };

    const backdated = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        subscribed: true,
        first_name: profile?.firstName || "there",
        results: firstResults as unknown as never,
        onboarding_completed: true,
        onboarding_completed_at: backdated,
        reassessment_results: secondResults as unknown as never,
        reassessment_reflections: reflections as unknown as never,
        reassessment_completed_at: new Date().toISOString(),
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
        persistOnboardingDraft,
        saveReassessment,
        setSubscribed,
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
