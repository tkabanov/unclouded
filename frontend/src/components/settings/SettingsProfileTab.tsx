import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  PROFILE_EMAIL_INPUT_BUBBLE_ID,
  PROFILE_FIRST_NAME_INPUT_BUBBLE_ID,
  PROFILE_FORM_BUBBLE_ID,
  PROFILE_FORM_CARD_BUBBLE_ID,
  PROFILE_PANEL_BUBBLE_ID,
  PROFILE_RECOVERY_SECTION_BUBBLE_ID,
  PROFILE_SAVE_BTN_BUBBLE_ID,
  PROFILE_SOBRIETY_DATE_INPUT_BUBBLE_ID,
  PROFILE_SOBRIETY_GROUP_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  loadProfileForm,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    loadProfileForm(user.id)
      .then((values) => {
        if (!cancelled) setForm(values);
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
    setSaving(true);
    try {
      await saveProfileForm(user.id, form);
      await refresh();
      const refreshed = await loadProfileForm(user.id);
      setForm(refreshed);
      toast.success("Profile saved.");
    } catch {
      toast.error("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [form, refresh, saving, user]);

  if (loading) {
    return (
      <div data-bubble-id={PROFILE_PANEL_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  return (
    <div data-bubble-id={PROFILE_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
      <div
        data-bubble-id={PROFILE_FORM_CARD_BUBBLE_ID}
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
      >
        <div data-bubble-id={PROFILE_FORM_BUBBLE_ID} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-first-name" className={bubbleStyle("Text_label_")}>
              First name
            </Label>
            <Input
              id="profile-first-name"
              data-bubble-id={PROFILE_FIRST_NAME_INPUT_BUBBLE_ID}
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              placeholder="Your first name"
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-email" className={bubbleStyle("Text_label_")}>
              Email
            </Label>
            <Input
              id="profile-email"
              type="email"
              data-bubble-id={PROFILE_EMAIL_INPUT_BUBBLE_ID}
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              placeholder="you@example.com"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </div>
        </div>

        <section
          data-bubble-id={PROFILE_RECOVERY_SECTION_BUBBLE_ID}
          className="flex flex-col gap-4 border-t border-border pt-4"
        >
          <p className={cn(bubbleStyle("Text_body_"), "text-sm font-medium")}>
            Recovery support
          </p>
          <p className={cn(bubbleStyle("Text_caption_"), "text-muted-foreground")}>
            Optional fields help tailor coaching when recovery mode is relevant for you.
          </p>

          <div
            data-bubble-id={PROFILE_SOBRIETY_GROUP_BUBBLE_ID}
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="profile-sobriety-date" className={bubbleStyle("Text_label_")}>
                Sobriety start date
              </Label>
              <Input
                id="profile-sobriety-date"
                type="date"
                data-bubble-id={PROFILE_SOBRIETY_DATE_INPUT_BUBBLE_ID}
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
            data-bubble-id={PROFILE_SAVE_BTN_BUBBLE_ID}
            data-style-ref="Button_primary_"
            className={bubbleStyle("Button_primary_")}
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
