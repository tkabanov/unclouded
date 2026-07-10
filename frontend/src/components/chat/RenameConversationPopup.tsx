import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  renameConversation,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface RenameConversationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationListItem | null;
  userId: string;
  onRenamed: () => void;
}

export default function RenameConversationPopup({
  open,
  onOpenChange,
  conversation,
  userId,
  onRenamed,
}: RenameConversationPopupProps) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && conversation) {
      setTitle(conversation.title);
    }
  }, [conversation, open]);

  const dismiss = () => onOpenChange(false);

  const handleSave = async () => {
    if (!conversation) return;
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Enter a conversation title.");
      return;
    }

    setSaving(true);
    try {
      await renameConversation(userId, conversation.id, trimmed);
      toast.success("Conversation renamed.");
      onRenamed();
      dismiss();
    } catch {
      toast.error("Couldn't rename that conversation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(bubbleStyle("Popup_dialog_"), "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle className={bubbleStyle("Text_heading_2_")}>Rename conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-conversation-title" className={bubbleStyle("Text_label_")}>
            Title
          </Label>
          <Input
            id="rename-conversation-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={bubbleStyle("Input_default_")}
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="ghost" onClick={dismiss} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="cta" onClick={handleSave} disabled={saving || !conversation}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
