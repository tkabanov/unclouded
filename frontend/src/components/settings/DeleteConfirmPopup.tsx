import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DELETE_CANCEL_BTN_BUBBLE_ID,
  DELETE_CONFIRM_ACTIONS_BUBBLE_ID,
  DELETE_CONFIRM_BTN_BUBBLE_ID,
  DELETE_CONFIRM_DESC_BUBBLE_ID,
  DELETE_CONFIRM_HEADER_BUBBLE_ID,
  DELETE_CONFIRM_POPUP_BUBBLE_ID,
  DELETE_CONFIRM_TITLE_BUBBLE_ID,
} from "@/lib/settings/routes";
import { bubbleStyle } from "@/styles";

export interface DeleteConfirmPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  busy?: boolean;
}

export default function DeleteConfirmPopup({
  open,
  onOpenChange,
  onConfirm,
  busy = false,
}: DeleteConfirmPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bubble-id={DELETE_CONFIRM_POPUP_BUBBLE_ID}>
        <DialogHeader data-bubble-id={DELETE_CONFIRM_HEADER_BUBBLE_ID}>
          <DialogTitle data-bubble-id={DELETE_CONFIRM_TITLE_BUBBLE_ID}>
            Delete Account & All Data
          </DialogTitle>
          <DialogDescription data-bubble-id={DELETE_CONFIRM_DESC_BUBBLE_ID}>
            This action is permanent and cannot be undone. All your chats, journals, check-ins,
            milestones, and personal data will be erased immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          data-bubble-id={DELETE_CONFIRM_ACTIONS_BUBBLE_ID}
          className="gap-2 sm:gap-0"
        >
          <Button
            type="button"
            variant="outline"
            data-bubble-id={DELETE_CANCEL_BTN_BUBBLE_ID}
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-bubble-id={DELETE_CONFIRM_BTN_BUBBLE_ID}
            className={bubbleStyle("Button_destructive_")}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Deleting…" : "Yes, Delete Everything"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
