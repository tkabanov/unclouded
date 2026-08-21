import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import VoiceSessionPanel from "@/components/voice/VoiceSessionPanel";
import {
  formatCustomerRoleTypesForDisplay,
  parseCustomerRoleTypesFromProfile,
} from "@/lib/enums/customerRoleTypes";
import { createConversation, fetchLatestUnfinishedVoiceConversation } from "@/lib/chat/chatConversationsApi";
import {
  canStartNewChatSession,
  FREE_TIER_UPSELL_MESSAGE,
} from "@/lib/chat/chatSessionLimit";
import { stopKotaSpeech } from "@/hooks/useVoiceSessionRecorder";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";

export default function VoiceSession() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const creatingRef = useRef(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [startingNewSession, setStartingNewSession] = useState(false);

  const conversationId = searchParams.get("id");

  const context = useMemo(() => {
    if (!profile) return undefined;
    const parts: string[] = [];
    if (profile.firstName) parts.push(`Name: ${profile.firstName}`);
    const roles = parseCustomerRoleTypesFromProfile(profile.roleTypes, profile.roleType);
    if (roles.length > 0) {
      parts.push(`Roles: ${formatCustomerRoleTypesForDisplay(roles)}`);
    } else if (profile.roleType) {
      parts.push(`Primary role: ${profile.roleType}`);
    }
    if (profile.primaryPillar) parts.push(`Focus area: ${profile.primaryPillar}`);
    const cls = profile.results?.classification?.name;
    if (cls) parts.push(`Current pattern: ${cls}`);
    return parts.length ? parts.join(". ") : undefined;
  }, [profile]);

  const profileData = useMemo(() => {
    if (!profile) return undefined;
    return {
      firstName: profile.firstName,
      roleType: profile.roleType,
      roleTypes: profile.roleTypes,
      primaryPillar: profile.primaryPillar,
      results: profile.results as unknown as Record<string, unknown> | null,
      onboardingData: profile.onboardingData,
    };
  }, [profile]);

  useEffect(() => {
    if (!user?.id) {
      setBootstrapping(false);
      return;
    }

    if (conversationId) {
      setBootstrapping(false);
      return;
    }

    if (creatingRef.current) return;

    creatingRef.current = true;
    void (async () => {
      try {
        const unfinished = await fetchLatestUnfinishedVoiceConversation(user.id);
        if (unfinished) {
          setSearchParams({ id: unfinished.id }, { replace: true });
          return;
        }

        if (
          !canStartNewChatSession({
            tier: profile?.tier ?? null,
            subscribed: profile?.subscribed ?? false,
            accountType: profile?.accountType ?? null,
            enterpriseTier: profile?.enterpriseTier ?? null,
            onboardingData: profile?.onboardingData ?? null,
          })
        ) {
          toast.error(FREE_TIER_UPSELL_MESSAGE);
          navigate("/dashboard", { replace: true });
          return;
        }

        const created = await createConversation(
          user.id,
          profile?.onboardingData ?? null,
          "Voice session",
          "voice",
        );
        setSearchParams({ id: created.id }, { replace: true });
      } catch {
        toast.error("Couldn't start a voice session. Please try again.");
        navigate("/dashboard", { replace: true });
      } finally {
        creatingRef.current = false;
        setBootstrapping(false);
      }
    })();
  }, [
    conversationId,
    navigate,
    profile?.accountType,
    profile?.enterpriseTier,
    profile?.onboardingData,
    profile?.subscribed,
    profile?.tier,
    setSearchParams,
    user?.id,
  ]);

  const handleSessionClosed = useCallback(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const handleNewSession = useCallback(async () => {
    if (!user?.id || creatingRef.current || startingNewSession) return;

    if (
      !canStartNewChatSession({
        tier: profile?.tier ?? null,
        subscribed: profile?.subscribed ?? false,
        accountType: profile?.accountType ?? null,
        enterpriseTier: profile?.enterpriseTier ?? null,
        onboardingData: profile?.onboardingData ?? null,
      })
    ) {
      toast.error(FREE_TIER_UPSELL_MESSAGE);
      return;
    }

    creatingRef.current = true;
    setStartingNewSession(true);
    stopKotaSpeech();

    try {
      const created = await createConversation(
        user.id,
        profile?.onboardingData ?? null,
        "Voice session",
        "voice",
      );
      setSearchParams({ id: created.id }, { replace: true });
    } catch {
      toast.error("Couldn't start a new voice session. Please try again.");
    } finally {
      creatingRef.current = false;
      setStartingNewSession(false);
    }
  }, [
    profile?.accountType,
    profile?.enterpriseTier,
    profile?.onboardingData,
    profile?.subscribed,
    profile?.tier,
    setSearchParams,
    startingNewSession,
    user?.id,
  ]);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] min-h-[480px] flex-col px-4 pb-4 md:px-6">
        {bootstrapping || !conversationId || !user ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Starting voice session…
          </div>
        ) : (
          <VoiceSessionPanel
            key={conversationId}
            conversationId={conversationId}
            userId={user.id}
            onboardingData={profile?.onboardingData ?? null}
            context={context}
            profileData={profileData}
            onSessionClosed={handleSessionClosed}
            onNewSession={() => void handleNewSession()}
            newSessionDisabled={startingNewSession}
            className="flex-1 min-h-0 rounded-xl border border-border bg-card"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
