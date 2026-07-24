import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import VoiceSessionPanel from "@/components/voice/VoiceSessionPanel";
import {
  formatCustomerRoleTypesForDisplay,
  parseCustomerRoleTypesFromProfile,
} from "@/lib/enums/customerRoleTypes";
import { createConversation } from "@/lib/chat/chatConversationsApi";
import {
  canStartNewChatSession,
  FREE_TIER_UPSELL_MESSAGE,
} from "@/lib/chat/chatSessionLimit";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";

export default function VoiceSession() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const creatingRef = useRef(false);
  const [bootstrapping, setBootstrapping] = useState(true);

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
      setBootstrapping(false);
      return;
    }

    creatingRef.current = true;
    void createConversation(user.id, profile?.onboardingData ?? null, "Voice session", "voice")
      .then((created) => {
        setSearchParams({ id: created.id }, { replace: true });
      })
      .catch(() => {
        toast.error("Couldn't start a voice session. Please try again.");
        navigate("/dashboard", { replace: true });
      })
      .finally(() => {
        creatingRef.current = false;
        setBootstrapping(false);
      });
  }, [
    conversationId,
    navigate,
    profile?.onboardingData,
    profile?.subscribed,
    profile?.tier,
    setSearchParams,
    user?.id,
  ]);

  const handleSessionClosed = useCallback(() => {
    void refreshProfile();
  }, [refreshProfile]);

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
            className="flex-1 min-h-0 rounded-xl border border-border bg-card"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
