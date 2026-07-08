import { useCallback, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ChatPageContent from "@/components/chat/ChatPageContent";
import ChatPanelMount from "@/components/chat/ChatPanelMount";
import ChatWelcomePanel from "@/components/chat/ChatWelcomePanel";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import DeleteConversationPopup from "@/components/chat/DeleteConversationPopup";
import type { ConversationListItem } from "@/lib/chat/chatConversationsApi";
import { useChatConversationParam } from "@/hooks/useChatConversationParam";
import { useChatSignOutClear } from "@/hooks/useChatSignOutClear";
import { useNewConversation } from "@/hooks/useNewConversation";
import {
  CHAT_HEADER_INSTANCE_BUBBLE_ID,
  CHAT_PAGE_BUBBLE_ID,
  CHAT_SIDEBAR_INSTANCE_BUBBLE_ID,
} from "@/lib/chat/routes";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";

const chatShellProps = {
  pageBubbleId: CHAT_PAGE_BUBBLE_ID,
  headerBubbleId: CHAT_HEADER_INSTANCE_BUBBLE_ID,
  sidebarBubbleId: CHAT_SIDEBAR_INSTANCE_BUBBLE_ID,
} as const;

export default function Chat() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { conversationId, setConversationId } = useChatConversationParam();
  useChatSignOutClear();

  const [deleteTarget, setDeleteTarget] = useState<ConversationListItem | null>(null);
  const [sidebarListVersion, setSidebarListVersion] = useState(0);

  const bumpSidebar = useCallback(() => {
    setSidebarListVersion((version) => version + 1);
  }, []);

  const { createNew } = useNewConversation({
    userId: user?.id,
    onboardingData: profile?.onboardingData ?? null,
    setConversationId,
    onCreated: bumpSidebar,
  });

  const context = useMemo(() => {
    if (!profile) return undefined;
    const parts: string[] = [];
    if (profile.firstName) parts.push(`Name: ${profile.firstName}`);
    if (profile.roleType) parts.push(`Primary role: ${profile.roleType}`);
    if (profile.primaryPillar) parts.push(`Focus area: ${profile.primaryPillar}`);
    const cls = profile.results?.classification?.name;
    if (cls) parts.push(`Current pattern: ${cls}`);
    return parts.length ? parts.join(". ") : undefined;
  }, [profile]);

  const handleRenameRequest = useCallback((_conversation: ConversationListItem) => {
    // Rename popup flow is out of scope for CHAT-02; wired for IR bS parity.
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

  return (
    <DashboardLayout {...chatShellProps}>
      <ChatPageContent
        onNewConversation={createNew}
        sidebar={
          <ConversationSidebar
            userId={user?.id}
            onboardingData={profile?.onboardingData ?? null}
            onRenameRequest={handleRenameRequest}
            onDeleteRequest={handleDeleteRequest}
            listVersion={sidebarListVersion}
          />
        }
        panel={
          conversationId && user ? (
            <ChatPanelMount
              key={conversationId}
              conversationId={conversationId}
              userId={user.id}
              onboardingData={profile?.onboardingData ?? null}
              context={context}
              listVersion={sidebarListVersion}
              onThreadUpdated={bumpSidebar}
            />
          ) : (
            <ChatWelcomePanel />
          )
        }
      />
      {user ? (
        <DeleteConversationPopup
          open={deleteTarget !== null}
          onOpenChange={handleDeletePopupOpenChange}
          conversation={deleteTarget}
          userId={user.id}
          onboardingData={profile?.onboardingData ?? null}
          onDeleted={handleConversationDeleted}
        />
      ) : null}
    </DashboardLayout>
  );
}
