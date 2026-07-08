import { useCallback, useMemo, useState } from "react";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import ChatWindow from "@/components/ChatWindow";
import ChatPageContent from "@/components/chat/ChatPageContent";
import ChatWelcomePanel from "@/components/chat/ChatWelcomePanel";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import DeleteConversationPopup from "@/components/chat/DeleteConversationPopup";
import {
  createConversation,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import { useChatConversationParam } from "@/lib/chat/chatRouteStore";
import {
  CHAT_HEADER_INSTANCE_BUBBLE_ID,
  CHAT_PAGE_BUBBLE_ID,
  CHAT_SIDEBAR_INSTANCE_BUBBLE_ID,
} from "@/lib/chat/routes";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";

interface ThreadMessages {
  messages: UIMessage[];
}

const chatShellProps = {
  pageBubbleId: CHAT_PAGE_BUBBLE_ID,
  headerBubbleId: CHAT_HEADER_INSTANCE_BUBBLE_ID,
  sidebarBubbleId: CHAT_SIDEBAR_INSTANCE_BUBBLE_ID,
} as const;

export default function Chat() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { conversationId, setConversationId } = useChatConversationParam();
  const [threadMessages, setThreadMessages] = useState<Record<string, ThreadMessages>>({});
  const [deleteTarget, setDeleteTarget] = useState<ConversationListItem | null>(null);
  const [sidebarListVersion, setSidebarListVersion] = useState(0);

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

  const activeMessages = conversationId
    ? (threadMessages[conversationId]?.messages ?? [])
    : [];

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
      setThreadMessages((prev) => {
        if (!(deletedId in prev)) return prev;
        const next = { ...prev };
        delete next[deletedId];
        return next;
      });
      setSidebarListVersion((version) => version + 1);
      setDeleteTarget(null);
    },
    [conversationId, setConversationId],
  );

  const handleMessagesChange = useCallback((id: string, messages: UIMessage[]) => {
    setThreadMessages((prev) => ({
      ...prev,
      [id]: { messages },
    }));
  }, []);

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
          conversationId ? (
            <ChatWindow
              key={conversationId}
              threadId={conversationId}
              initialMessages={activeMessages}
              context={context}
              onMessagesChange={(messages) => handleMessagesChange(conversationId, messages)}
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
