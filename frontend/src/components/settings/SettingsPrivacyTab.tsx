import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Building2, Database, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DeleteConfirmPopup from "@/components/settings/DeleteConfirmPopup";
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
      <div className="flex flex-col gap-6">
        <div
          className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
        >
          <header
            className="flex flex-col gap-2"
          >
            <h2
              className={bubbleStyle("Text_heading_3_")}
            >
              Privacy & Data
            </h2>
            <p
              className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
            >
              Your data is private by default. Here&apos;s exactly how it is handled and what you
              can do with it.
            </p>
          </header>

          <div className="space-y-6">
            <section
              className="space-y-2"
            >
              <div
                className="flex items-start gap-3"
              >
                <Database
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="space-y-2">
                  <h3
                    className={bubbleStyle("Text_heading_3_")}
                  >
                    Your Personal Data
                  </h3>
                  <p
                    className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
                  >
                    All chat conversations, journal entries, daily check-ins, milestones, and
                    recovery records are private to you. No admin can inspect your individual
                    records. Your data is encrypted at rest and in transit.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div
                className="flex items-start gap-3"
              >
                <Bot
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="space-y-2">
                  <h3
                    className={bubbleStyle("Text_heading_3_")}
                  >
                    AI Coaching Scope
                  </h3>
                  <p
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
              className="space-y-2"
            >
              <div
                className="flex items-start gap-3"
              >
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="space-y-2">
                  <h3
                    className={bubbleStyle("Text_heading_3_")}
                  >
                    Employer & Workplace Accounts
                  </h3>
                  <p
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
              className="space-y-3 border-t border-border pt-4"
            >
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <h3
                  className={bubbleStyle("Text_heading_3_")}
                >
                  Data Controls
                </h3>
              </div>
              <div
                className="flex flex-wrap gap-3"
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={exporting}
                  onClick={() => void handleExport()}
                >
                  {exporting ? "Preparing export…" : "Export My Data"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
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
