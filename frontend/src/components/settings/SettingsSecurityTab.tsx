import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePassword,
  SecurityChangePasswordError,
  sendPasswordResetEmail,
} from "@/lib/settings/securityApi";
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
    if (saving || !user?.email) return;
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
      await changePassword(user.email, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (error) {
      if (error instanceof SecurityChangePasswordError) {
        toast.error(error.message);
      } else {
        toast.error("Couldn't update your password.");
      }
    } finally {
      setSaving(false);
    }
  }, [confirmPassword, currentPassword, newPassword, saving, user?.email]);

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
    <div className="flex flex-col gap-6">
      <div
        className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-6 p-6")}
      >
        <header className="space-y-1">
          <h2
            className={bubbleStyle("Text_heading_2_")}
          >
            Security
          </h2>
          <p
            className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}
          >
            Update your password and manage active sessions.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          <div
            className="flex flex-col gap-2"
          >
            <Label
              htmlFor="security-current"
              className={bubbleStyle("Text_label_")}
            >
              Current Password
            </Label>
            <Input
              id="security-current"
              type="password"
              autoComplete="current-password"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <Label
              htmlFor="security-new"
              className={bubbleStyle("Text_label_")}
            >
              New Password
            </Label>
            <Input
              id="security-new"
              type="password"
              autoComplete="new-password"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <Label
              htmlFor="security-confirm"
              className={bubbleStyle("Text_label_")}
            >
              Confirm New Password
            </Label>
            <Input
              id="security-confirm"
              type="password"
              autoComplete="new-password"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>

        <div
          className="flex flex-wrap gap-3 border-t border-border pt-4"
        >
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            disabled={saving}
            onClick={() => void handleChangePassword()}
          >
            {saving ? "Updating…" : "Update Password"}
          </Button>
          <Button
            type="button"
            className={bubbleStyle("Button_outline_")}
            disabled={sendingReset || !user?.email}
            onClick={() => void handleResetEmail()}
          >
            {sendingReset ? "Sending…" : "Send Password Reset Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}
