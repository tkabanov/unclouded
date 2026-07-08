import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DeleteConfirmPopup from "@/components/settings/DeleteConfirmPopup";
import {
  PRIVACY_DELETE_BTN_BUBBLE_ID,
  PRIVACY_EXPORT_BTN_BUBBLE_ID,
  PRIVACY_INFO_CARD_BUBBLE_ID,
  PRIVACY_PANEL_BUBBLE_ID,
  PRIVACY_SECTIONS_BUBBLE_ID,
} from "@/lib/settings/routes";
import { exportUserData, requestAccountDeletion } from "@/lib/settings/privacyApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsPrivacyTab() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const blob = await exportUserData(user.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `uncloud360-export-${user.id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Your data export has started.");
    } catch {
      toast.error("Couldn't export your data.");
    } finally {
      setExporting(false);
    }
  }, [exporting, user]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!user || deleting) return;
    setDeleting(true);
    try {
      await requestAccountDeletion(user.id);
      toast.success("Your account has been deleted.");
      setDeleteOpen(false);
    } catch {
      toast.error("Couldn't delete your account. Please contact support.");
      setDeleting(false);
    }
  }, [deleting, user]);

  return (
    <>
      <div data-bubble-id={PRIVACY_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
        <div
          data-bubble-id={PRIVACY_INFO_CARD_BUBBLE_ID}
          className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
        >
          <div data-bubble-id={PRIVACY_SECTIONS_BUBBLE_ID} className="space-y-6">
            <section className="space-y-2">
              <h2 className={bubbleStyle("Text_heading_3_")}>Your data</h2>
              <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
                Export a copy of your profile, onboarding answers, and coaching history stored in
                Uncloud360.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className={bubbleStyle("Text_heading_3_")}>AI & coaching</h2>
              <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
                Coaching conversations may be processed by AI services to generate responses. We do
                not sell your personal data.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className={bubbleStyle("Text_heading_3_")}>Employer programs</h2>
              <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
                If your access is sponsored by an employer, aggregated usage metrics may be shared
                without individual message content.
              </p>
            </section>

            <section className="flex flex-wrap gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                data-bubble-id={PRIVACY_EXPORT_BTN_BUBBLE_ID}
                disabled={exporting}
                onClick={() => void handleExport()}
              >
                {exporting ? "Preparing export…" : "Export my data"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                data-bubble-id={PRIVACY_DELETE_BTN_BUBBLE_ID}
                onClick={() => setDeleteOpen(true)}
              >
                Delete account
              </Button>
            </section>
          </div>
        </div>
      </div>

      <DeleteConfirmPopup
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => void handleDeleteConfirm()}
        busy={deleting}
      />
    </>
  );
}
