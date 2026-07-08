import { useCallback, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import ChatPageContent from "@/components/chat/ChatPageContent";
import ChatPanelMount from "@/components/chat/ChatPanelMount";
import ChatWelcomePanel from "@/components/chat/ChatWelcomePanel";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import DeleteConversationPopup from "@/components/chat/DeleteConversationPopup";
import {
  createConversation,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import { useChatConversationParam } from "@/hooks/useChatConversationParam";
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
  const [deleteTarget, setDeleteTarget] = useState<ConversationListItem | null>(null);
  const [sidebarListVersion, setSidebarListVersion] = useState(0);

  const handleNew = useCallback(async () => {
    if (!user) return;
    try {
      const created = await createConversation(user.id, profile?.onboardingData ?? null);
      setConversationId(created.id);
    } catch {
      toast.error("Couldn't start a new conversation. Please try again.");
    }
  }, [profile?.onboardingData, setConversationId, user]);

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
      setSidebarListVersion((version) => version + 1);
      setDeleteTarget(null);
    },
    [conversationId, setConversationId],
  );

  return (
    <DashboardLayout {...chatShellProps}>
      <ChatPageContent
        onNewConversation={handleNew}
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
              listVersion={sidebarListVersion}
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
