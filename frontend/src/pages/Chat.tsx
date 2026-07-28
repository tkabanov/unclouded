import { useCallback, useMemo, useState } from "react";
import {
  formatCustomerRoleTypesForDisplay,
  parseCustomerRoleTypesFromProfile,
} from "@/lib/enums/customerRoleTypes";
import DashboardLayout from "@/components/DashboardLayout";
import ChatPageContent from "@/components/chat/ChatPageContent";
import ConversationPanelMount from "@/components/chat/ConversationPanelMount";
import ChatWelcomePanel from "@/components/chat/ChatWelcomePanel";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import DeleteConversationPopup from "@/components/chat/DeleteConversationPopup";
import RenameConversationPopup from "@/components/chat/RenameConversationPopup";
import LockedFeatureUpgradeDialog from "@/components/subscription/LockedFeatureUpgradeDialog";
import type { ConversationListItem } from "@/lib/chat/chatConversationsApi";
import { isAtFreeTierSessionLimit } from "@/lib/chat/chatSessionLimit";
import { useChatConversationParam } from "@/hooks/useChatConversationParam";
import { useChatSignOutClear } from "@/hooks/useChatSignOutClear";
import { useLockedFeatureUpsell } from "@/hooks/useLockedFeatureUpsell";
import { useNewConversation } from "@/hooks/useNewConversation";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";

export default function Chat() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useUserProfile();
  const { conversationId, setConversationId } = useChatConversationParam();
  useChatSignOutClear();

  const [deleteTarget, setDeleteTarget] = useState<ConversationListItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<ConversationListItem | null>(null);
  const [sidebarListVersion, setSidebarListVersion] = useState(0);

  const tier = resolveCurrentTier(
    !!profile?.subscribed,
    profile?.tier,
    profile?.accountType,
    profile?.enterpriseTier,
  );
  const { openFeature, promptUpgrade, closeUpsell } = useLockedFeatureUpsell(tier);

  const bumpSidebar = useCallback(() => {
    setSidebarListVersion((version) => version + 1);
  }, []);

  const handleSessionLimitReached = useCallback(() => {
    promptUpgrade("chatSessionLimit");
  }, [promptUpgrade]);

  const { createNew } = useNewConversation({
    userId: user?.id,
    onboardingData: profile?.onboardingData ?? null,
    tier: profile?.tier ?? null,
    subscribed: profile?.subscribed ?? false,
    accountType: profile?.accountType ?? null,
    enterpriseTier: profile?.enterpriseTier ?? null,
    setConversationId,
    onCreated: bumpSidebar,
    onSessionLimitReached: handleSessionLimitReached,
  });

  // At the limit the button stays clickable so the contextual upgrade dialog can
  // explain the cap, rather than leaving the user with a dead control.
  const atSessionLimit = useMemo(
    () =>
      isAtFreeTierSessionLimit({
        tier: profile?.tier ?? null,
        subscribed: profile?.subscribed ?? false,
        accountType: profile?.accountType ?? null,
        enterpriseTier: profile?.enterpriseTier ?? null,
        onboardingData: profile?.onboardingData ?? null,
      }),
    [
      profile?.accountType,
      profile?.enterpriseTier,
      profile?.onboardingData,
      profile?.subscribed,
      profile?.tier,
    ],
  );

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

  const handleRenameRequest = useCallback((conversation: ConversationListItem) => {
    setRenameTarget(conversation);
  }, []);

  const handleRenamePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setRenameTarget(null);
  }, []);

  const handleDeleteRequest = useCallback((conversation: ConversationListItem) => {
    setDeleteTarget(conversation);
  }, []);

  const handleDeletePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleConversationDeleted = useCallback(
    (deletedId: string) => {
      if (conversationId === deletedId) {
        setConversationId(null);
      }
      bumpSidebar();
      setDeleteTarget(null);
    },
    [bumpSidebar, conversationId, setConversationId],
  );

  const handleSessionClosed = useCallback(() => {
    void refreshProfile();
  }, [refreshProfile]);

  return (
    <DashboardLayout>
      <ChatPageContent
        onNewConversation={createNew}
        newConversationDisabled={false}
        newConversationLocked={atSessionLimit}
        sidebar={
          <ConversationSidebar
            userId={user?.id}
            onboardingData={profile?.onboardingData ?? null}
            tier={profile?.tier ?? null}
            subscribed={profile?.subscribed ?? false}
            accountType={profile?.accountType ?? null}
            enterpriseTier={profile?.enterpriseTier ?? null}
            onRenameRequest={handleRenameRequest}
            onDeleteRequest={handleDeleteRequest}
            listVersion={sidebarListVersion}
          />
        }
        panel={
          conversationId && user ? (
            <ConversationPanelMount
              key={conversationId}
              conversationId={conversationId}
              userId={user.id}
              onboardingData={profile?.onboardingData ?? null}
              context={context}
              profileData={profileData}
              onThreadUpdated={bumpSidebar}
              onSessionClosed={handleSessionClosed}
            />
          ) : (
            <ChatWelcomePanel />
          )
        }
      />
      {user ? (
        <>
          <DeleteConversationPopup
            open={deleteTarget !== null}
            onOpenChange={handleDeletePopupOpenChange}
            conversation={deleteTarget}
            userId={user.id}
            onboardingData={profile?.onboardingData ?? null}
            onDeleted={handleConversationDeleted}
          />
          <RenameConversationPopup
            open={renameTarget !== null}
            onOpenChange={handleRenamePopupOpenChange}
            conversation={renameTarget}
            userId={user.id}
            onRenamed={bumpSidebar}
          />
        </>
      ) : null}
      <LockedFeatureUpgradeDialog
        open={openFeature === "chatSessionLimit"}
        feature="chatSessionLimit"
        currentTier={tier}
        onClose={closeUpsell}
      />
    </DashboardLayout>
  );
}
