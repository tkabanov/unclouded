import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteConversation,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface DeleteConversationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationListItem | null;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  onDeleted: (conversationId: string) => void;
}

export default function DeleteConversationPopup({
  open,
  onOpenChange,
  conversation,
  userId,
  onboardingData,
  onDeleted,
}: DeleteConversationPopupProps) {
  const [deleting, setDeleting] = useState(false);

  const dismiss = () => onOpenChange(false);

  const handleConfirm = async () => {
    if (!conversation) return;

    setDeleting(true);
    try {
      await deleteConversation(userId, conversation.id, onboardingData);
      toast.success("Conversation deleted.");
      onDeleted(conversation.id);
      dismiss();
    } catch {
      toast.error("Couldn't delete that conversation.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-style-ref="Popup_dialog_"
        className={cn(bubbleStyle("Popup_dialog_"), "sm:max-w-md")}
      >
        <DialogHeader
          className={cn(bubbleStyle("Group_transparent_"), "space-y-0")}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                bubbleStyle("Group_transparent_"),
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10",
              )}
            >
              <Trash2
                className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 text-destructive")}
                aria-hidden
              />
            </div>
            <div
              className={cn(bubbleStyle("Group_transparent_"), "space-y-1 text-left")}
            >
              <DialogTitle
                data-style-ref="Text_heading_2_"
                className={cn(bubbleStyle("Text_heading_2_"), "text-left")}
              >
                Delete Conversation
              </DialogTitle>
              <p
                data-style-ref="Text_small_"
                className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}
              >
                This cannot be undone
              </p>
            </div>
          </div>
        </DialogHeader>

        <p
          data-style-ref="Text_body_"
          className={cn(bubbleStyle("Text_body_"), "text-sm text-muted-foreground")}
        >
          All messages in this conversation will be permanently deleted. Are you sure you want to
          continue?
        </p>

        <DialogFooter
          className={cn(bubbleStyle("Group_transparent_"), "gap-2 sm:justify-end")}
        >
          <Button
            type="button"
            variant="ghost"
            data-style-ref="Button_ghost_"
            className={bubbleStyle("Button_ghost_")}
            onClick={dismiss}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="cta"
            data-delete-confirm-btn
            data-style-ref="Button_primary_"
            className={bubbleStyle("Button_primary_")}
            onClick={handleConfirm}
            disabled={deleting || !conversation}
          >
            {deleting ? "Deleting…" : "Delete Conversation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
