import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SECURITY_CHANGE_PWD_BTN_BUBBLE_ID,
  SECURITY_CONFIRM_PASSWORD_INPUT_BUBBLE_ID,
  SECURITY_CURRENT_PASSWORD_INPUT_BUBBLE_ID,
  SECURITY_FORM_BUBBLE_ID,
  SECURITY_FORM_CARD_BUBBLE_ID,
  SECURITY_NEW_PASSWORD_INPUT_BUBBLE_ID,
  SECURITY_PANEL_BUBBLE_ID,
  SECURITY_RESET_EMAIL_BTN_BUBBLE_ID,
} from "@/lib/settings/routes";
import { changePassword, sendPasswordResetEmail } from "@/lib/settings/securityApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsSecurityTab() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleChangePassword = useCallback(async () => {
    if (saving) return;
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!currentPassword) {
      toast.error("Enter your current password.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch {
      toast.error("Couldn't update your password.");
    } finally {
      setSaving(false);
    }
  }, [confirmPassword, currentPassword, newPassword, saving]);

  const handleResetEmail = useCallback(async () => {
    if (!user?.email || sendingReset) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(user.email);
      toast.success("Password reset email sent.");
    } catch {
      toast.error("Couldn't send reset email.");
    } finally {
      setSendingReset(false);
    }
  }, [sendingReset, user?.email]);

  return (
    <div data-bubble-id={SECURITY_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
      <div
        data-bubble-id={SECURITY_FORM_CARD_BUBBLE_ID}
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
      >
        <header className="space-y-1">
          <h2 className={bubbleStyle("Text_heading_3_")}>Password & sign-in</h2>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
            Update your password or request a reset link by email.
          </p>
        </header>

        <div data-bubble-id={SECURITY_FORM_BUBBLE_ID} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="security-current" className={bubbleStyle("Text_label_")}>
              Current password
            </Label>
            <Input
              id="security-current"
              type="password"
              autoComplete="current-password"
              data-bubble-id={SECURITY_CURRENT_PASSWORD_INPUT_BUBBLE_ID}
              className={bubbleStyle("Input_default_")}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="security-new" className={bubbleStyle("Text_label_")}>
              New password
            </Label>
            <Input
              id="security-new"
              type="password"
              autoComplete="new-password"
              data-bubble-id={SECURITY_NEW_PASSWORD_INPUT_BUBBLE_ID}
              className={bubbleStyle("Input_default_")}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="security-confirm" className={bubbleStyle("Text_label_")}>
              Confirm new password
            </Label>
            <Input
              id="security-confirm"
              type="password"
              autoComplete="new-password"
              data-bubble-id={SECURITY_CONFIRM_PASSWORD_INPUT_BUBBLE_ID}
              className={bubbleStyle("Input_default_")}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border pt-4">
          <Button
            type="button"
            data-bubble-id={SECURITY_CHANGE_PWD_BTN_BUBBLE_ID}
            className={bubbleStyle("Button_primary_")}
            disabled={saving}
            onClick={() => void handleChangePassword()}
          >
            {saving ? "Updating…" : "Change password"}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-bubble-id={SECURITY_RESET_EMAIL_BTN_BUBBLE_ID}
            disabled={sendingReset || !user?.email}
            onClick={() => void handleResetEmail()}
          >
            {sendingReset ? "Sending…" : "Email reset link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
