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
  DELETE_CONFIRM_BTN_BUBBLE_ID,
  DELETE_CONFIRM_POPUP_BUBBLE_ID,
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
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently removes your profile data from Uncloud360. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
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
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
