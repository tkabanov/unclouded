import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete Account & All Data
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. All your chats, journals, check-ins,
            milestones, and personal data will be erased immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          className="gap-2 sm:gap-0"
        >
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
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
