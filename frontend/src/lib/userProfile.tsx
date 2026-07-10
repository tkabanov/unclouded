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
  tier: string | null;
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

export interface SaveOnboardingOptions {
  /** When false, keeps onboardingCompleted false until markOnboardingComplete runs. */
  markComplete?: boolean;
  /** When false, skips reloading profile context (avoids premature dashboard redirect). */
  refresh?: boolean;
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
  saveOnboarding: (payload: OnboardingPayload, options?: SaveOnboardingOptions) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  persistOnboardingDraft: (payload: OnboardingDraftPayload) => Promise<void>;
  saveReassessment: (payload: ReassessmentPayload) => Promise<void>;
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
        "firstName, roleType, primaryPillar, results, onboardingCompleted, onboardingCompletedAt, onboardingData, subscribed, tier, reassessmentResults, reassessmentReflections, reassessmentCompletedAt"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfileState(null);
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
        reassessmentResults:
          (data.reassessmentResults as unknown as ResultsData | null) ?? null,
        reassessmentReflections:
          (data.reassessmentReflections as unknown as ReflectionAnswers | null) ?? null,
        reassessmentCompletedAt: data.reassessmentCompletedAt ?? null,
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
            roleType: payload.roleType,
            primaryPillar: payload.primaryPillar,
            results: payload.results as unknown as never,
            onboardingData: payload.onboardingData as unknown as never,
            onboardingCompleted: markComplete,
            onboardingCompletedAt: markComplete ? completedAt : null,
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
    const { error } = await supabase
      .from("profiles")
      .update({
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
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
          reassessmentResults: payload.results as unknown as never,
          reassessmentData: payload.reassessmentData as unknown as never,
          reassessmentReflections: payload.reflections as unknown as never,
          reassessmentCompletedAt: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      await loadProfile();
    },
    [user, loadProfile]
  );

  const simulate90DaysElapsed = useCallback(async () => {
    if (!user) throw new Error("Not authenticated");
    const backdated = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ onboardingCompletedAt: backdated })
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
        firstName: profile?.firstName || "there",
        results: firstResults as unknown as never,
        onboardingCompleted: true,
        onboardingCompletedAt: backdated,
        reassessmentResults: secondResults as unknown as never,
        reassessmentReflections: reflections as unknown as never,
        reassessmentCompletedAt: new Date().toISOString(),
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
