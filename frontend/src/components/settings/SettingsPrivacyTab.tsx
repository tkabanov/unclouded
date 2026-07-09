import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Building2, Database, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DeleteConfirmPopup from "@/components/settings/DeleteConfirmPopup";
import {
  PRIVACY_ACTIONS_ROW_BUBBLE_ID,
  PRIVACY_ACTIONS_SECTION_BUBBLE_ID,
  PRIVACY_ACTIONS_TITLE_BUBBLE_ID,
  PRIVACY_AI_DESC_BUBBLE_ID,
  PRIVACY_AI_HEADER_BUBBLE_ID,
  PRIVACY_AI_ICON_BUBBLE_ID,
  PRIVACY_AI_SECTION_BUBBLE_ID,
  PRIVACY_AI_TITLE_BUBBLE_ID,
  PRIVACY_CARD_HEADER_BUBBLE_ID,
  PRIVACY_CARD_SUBTITLE_BUBBLE_ID,
  PRIVACY_CARD_TITLE_BUBBLE_ID,
  PRIVACY_DATA_DESC_BUBBLE_ID,
  PRIVACY_DATA_HEADER_BUBBLE_ID,
  PRIVACY_DATA_ICON_BUBBLE_ID,
  PRIVACY_DATA_SECTION_BUBBLE_ID,
  PRIVACY_DATA_TITLE_BUBBLE_ID,
  PRIVACY_DELETE_BTN_BUBBLE_ID,
  PRIVACY_EMPLOYER_DESC_BUBBLE_ID,
  PRIVACY_EMPLOYER_HEADER_BUBBLE_ID,
  PRIVACY_EMPLOYER_ICON_BUBBLE_ID,
  PRIVACY_EMPLOYER_SECTION_BUBBLE_ID,
  PRIVACY_EMPLOYER_TITLE_BUBBLE_ID,
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
  const navigate = useNavigate();
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
      anchor.download = `unclouded-export-${user.id}.json`;
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
      toast.success("Your account and data have been deleted.");
      setDeleteOpen(false);
      navigate("/", { replace: true });
    } catch {
      toast.error("Couldn't delete your account. Please contact support.");
      setDeleting(false);
    }
  }, [deleting, navigate, user]);

  return (
    <>
      <div data-bubble-id={PRIVACY_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
        <div
          data-bubble-id={PRIVACY_INFO_CARD_BUBBLE_ID}
          className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
        >
          <header
            data-bubble-id={PRIVACY_CARD_HEADER_BUBBLE_ID}
            className="flex flex-col gap-2"
          >
            <h2
              data-bubble-id={PRIVACY_CARD_TITLE_BUBBLE_ID}
              className={bubbleStyle("Text_heading_3_")}
            >
              Privacy & Data
            </h2>
            <p
              data-bubble-id={PRIVACY_CARD_SUBTITLE_BUBBLE_ID}
              className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
            >
              Your data is private by default. Here&apos;s exactly how it is handled and what you
              can do with it.
            </p>
          </header>

          <div data-bubble-id={PRIVACY_SECTIONS_BUBBLE_ID} className="space-y-6">
            <section
              data-bubble-id={PRIVACY_DATA_SECTION_BUBBLE_ID}
              className="space-y-2"
            >
              <div
                data-bubble-id={PRIVACY_DATA_HEADER_BUBBLE_ID}
                className="flex items-start gap-3"
              >
                <Database
                  data-bubble-id={PRIVACY_DATA_ICON_BUBBLE_ID}
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="space-y-2">
                  <h3
                    data-bubble-id={PRIVACY_DATA_TITLE_BUBBLE_ID}
                    className={bubbleStyle("Text_heading_3_")}
                  >
                    Your Personal Data
                  </h3>
                  <p
                    data-bubble-id={PRIVACY_DATA_DESC_BUBBLE_ID}
                    className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
                  >
                    All chat conversations, journal entries, daily check-ins, milestones, and
                    recovery records are private to you. No admin can inspect your individual
                    records. Your data is encrypted at rest and in transit.
                  </p>
                </div>
              </div>
            </section>

            <section data-bubble-id={PRIVACY_AI_SECTION_BUBBLE_ID} className="space-y-2">
              <div
                data-bubble-id={PRIVACY_AI_HEADER_BUBBLE_ID}
                className="flex items-start gap-3"
              >
                <Bot
                  data-bubble-id={PRIVACY_AI_ICON_BUBBLE_ID}
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="space-y-2">
                  <h3
                    data-bubble-id={PRIVACY_AI_TITLE_BUBBLE_ID}
                    className={bubbleStyle("Text_heading_3_")}
                  >
                    AI Coaching Scope
                  </h3>
                  <p
                    data-bubble-id={PRIVACY_AI_DESC_BUBBLE_ID}
                    className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
                  >
                    Unclouded&apos;s AI is for personal coaching only — not therapy, diagnosis, or
                    medical advice. The AI uses your recent history to personalize coaching
                    language, but never stores sensitive data beyond what you explicitly share.
                  </p>
                </div>
              </div>
            </section>

            <section
              data-bubble-id={PRIVACY_EMPLOYER_SECTION_BUBBLE_ID}
              className="space-y-2"
            >
              <div
                data-bubble-id={PRIVACY_EMPLOYER_HEADER_BUBBLE_ID}
                className="flex items-start gap-3"
              >
                <Building2
                  data-bubble-id={PRIVACY_EMPLOYER_ICON_BUBBLE_ID}
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="space-y-2">
                  <h3
                    data-bubble-id={PRIVACY_EMPLOYER_TITLE_BUBBLE_ID}
                    className={bubbleStyle("Text_heading_3_")}
                  >
                    Employer & Workplace Accounts
                  </h3>
                  <p
                    data-bubble-id={PRIVACY_EMPLOYER_DESC_BUBBLE_ID}
                    className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
                  >
                    If your account is linked to a workplace, your employer only ever sees
                    anonymized, aggregated insights (e.g., team-level engagement trends). They
                    cannot view any individual chat, journal entry, check-in, or personal detail.
                    Ever.
                  </p>
                </div>
              </div>
            </section>

            <section
              data-bubble-id={PRIVACY_ACTIONS_SECTION_BUBBLE_ID}
              className="space-y-3 border-t border-border pt-4"
            >
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <h3
                  data-bubble-id={PRIVACY_ACTIONS_TITLE_BUBBLE_ID}
                  className={bubbleStyle("Text_heading_3_")}
                >
                  Data Controls
                </h3>
              </div>
              <div
                data-bubble-id={PRIVACY_ACTIONS_ROW_BUBBLE_ID}
                className="flex flex-wrap gap-3"
              >
                <Button
                  type="button"
                  variant="outline"
                  data-bubble-id={PRIVACY_EXPORT_BTN_BUBBLE_ID}
                  disabled={exporting}
                  onClick={() => void handleExport()}
                >
                  {exporting ? "Preparing export…" : "Export My Data"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  data-bubble-id={PRIVACY_DELETE_BTN_BUBBLE_ID}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete Account & Data
                </Button>
              </div>
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
