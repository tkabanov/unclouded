import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  loadProfileForm,
  ProfileSaveError,
  saveProfileForm,
  type ProfileFormState,
} from "@/lib/settings/profileApi";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const EMPTY_FORM: ProfileFormState = {
  firstName: "",
  email: "",
  sobrietyStartDate: "",
  recoveryModeActive: false,
};

export default function SettingsProfileTab() {
  const { user } = useAuth();
  const { refresh } = useUserProfile();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [initialEmail, setInitialEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const emailChanged =
    initialEmail.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.email.trim().toLowerCase() !== initialEmail.trim().toLowerCase();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    loadProfileForm(user.id, user.email)
      .then((values) => {
        if (!cancelled) {
          setForm(values);
          setInitialEmail(user.email ?? values.email);
          setCurrentPassword("");
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateField = useCallback(
    <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!user || saving) return;

    if (emailChanged && !currentPassword) {
      toast.error("Enter your current password to change your email.");
      return;
    }

    setSaving(true);
    try {
      await saveProfileForm(user.id, form, {
        originalEmail: initialEmail,
        currentPassword: emailChanged ? currentPassword : undefined,
      });
      await refresh();
      const refreshed = await loadProfileForm(user.id, form.email.trim() || user.email);
      setForm(refreshed);
      setInitialEmail(refreshed.email);
      setCurrentPassword("");
      toast.success("Profile updated successfully!");
    } catch (error) {
      if (error instanceof ProfileSaveError) {
        toast.error(error.message);
      } else {
        toast.error("Couldn't save your profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }, [currentPassword, emailChanged, form, initialEmail, refresh, saving, user]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-6 p-6")}
      >
        <header className="space-y-1">
          <h2
            className={bubbleStyle("Text_heading_2_")}
          >
            Personal Information
          </h2>
          <p
            className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}
          >
            Update your name, email, timezone, and coaching mode. Changes take effect immediately
            across the app.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-first-name"
              className={bubbleStyle("Text_label_")}
            >
              First Name
            </Label>
            <Input
              id="profile-first-name"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              placeholder="Your first name"
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-email"
              className={bubbleStyle("Text_label_")}
            >
              Email Address
            </Label>
            <Input
              id="profile-email"
              type="email"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              placeholder="you@example.com"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </div>

          {emailChanged ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-current-password" className={bubbleStyle("Text_label_")}>
                Current password
              </Label>
              <Input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                data-style-ref="Input_default_"
                className={bubbleStyle("Input_default_")}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
          ) : null}
        </div>

        <section
          className="flex flex-col gap-4 border-t border-border pt-4"
        >
          <p
            className={cn(bubbleStyle("Text_body_"), "text-sm font-medium")}
          >
            Recovery Fields (shown for Recovery sub-mode — all data is private)
          </p>

          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Label
                htmlFor="profile-sobriety-date"
                className={bubbleStyle("Text_label_")}
              >
                Sobriety Start Date
              </Label>
              <Input
                id="profile-sobriety-date"
                type="date"
                data-style-ref="Input_default_"
                className={bubbleStyle("Input_default_")}
                value={form.sobrietyStartDate}
                onChange={(event) => updateField("sobrietyStartDate", event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pb-1">
              <Switch
                id="profile-recovery-mode"
                checked={form.recoveryModeActive}
                onCheckedChange={(checked) => updateField("recoveryModeActive", checked)}
              />
              <Label htmlFor="profile-recovery-mode" className={bubbleStyle("Text_caption_")}>
                Recovery mode active
              </Label>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button
            type="button"
            data-style-ref="Button_primary_"
            className={bubbleStyle("Button_primary_")}
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
