import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import SettingsAboutYouSection from "@/components/settings/SettingsAboutYouSection";
import SettingsKnowYourselfSection from "@/components/settings/SettingsKnowYourselfSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMPTY_ABOUT_YOU_FORM,
  bootstrapTimeZoneIfEmpty,
  loadProfileSettingsForms,
  saveAboutYouForm,
  saveProfileForm,
  type AboutYouFormState,
  type ProfileFormState,
} from "@/lib/settings/profileApi";
import { detectBrowserTimeZone } from "@/lib/settings/timeZone";
import { useUserProfile } from "@/lib/userProfile";
import { resolveHealthModeFlags } from "@/lib/userProfile/healthModeFlags";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const EMPTY_FORM: ProfileFormState = {
  firstName: "",
  lastName: "",
  sobrietyStartDate: "",
};

export default function SettingsProfileTab() {
  const { user } = useAuth();
  const { profile, refresh } = useUserProfile();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [aboutYouForm, setAboutYouForm] = useState<AboutYouFormState>(EMPTY_ABOUT_YOU_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { recoveryModeActive } = resolveHealthModeFlags(profile);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const [{ personal, aboutYou }, bootstrappedTimeZone] = await Promise.all([
          loadProfileSettingsForms(user.id),
          bootstrapTimeZoneIfEmpty(user.id, detectBrowserTimeZone()),
        ]);

        if (!cancelled) {
          setForm({
            ...personal,
            firstName: personal.firstName || profile?.firstName || "",
            lastName: personal.lastName,
          });
          setAboutYouForm(
            bootstrappedTimeZone && !aboutYou.timeZone
              ? { ...aboutYou, timeZone: bootstrappedTimeZone }
              : aboutYou,
          );
        }
      } catch {
        if (!cancelled) toast.error("Couldn't load your profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.firstName, user]);

  const updateField = useCallback(
    <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateAboutYouField = useCallback(
    <K extends keyof AboutYouFormState>(key: K, value: AboutYouFormState[K]) => {
      setAboutYouForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!user || saving) return;

    setSaving(true);
    try {
      await saveProfileForm(user.id, form);
      await saveAboutYouForm(user.id, aboutYouForm);
      await refresh();
      const { personal, aboutYou } = await loadProfileSettingsForms(user.id);
      setForm({
        ...personal,
        firstName: personal.firstName || profile?.firstName || "",
      });
      setAboutYouForm(aboutYou);
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [aboutYouForm, form, refresh, saving, user]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading profile…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-6 p-6")}>
        <header className="space-y-1">
          <h2 className={bubbleStyle("Text_heading_2_")}>Personal Information</h2>
          <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
            Update your name. Changes take effect immediately across the app.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-first-name" className={bubbleStyle("Text_label_")}>
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
            <Label htmlFor="profile-last-name" className={bubbleStyle("Text_label_")}>
              Last Name
            </Label>
            <Input
              id="profile-last-name"
              data-bubble-id="bTIgc"
              data-style-ref="Input_default_"
              className={bubbleStyle("Input_default_")}
              placeholder="Your last name"
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className={bubbleStyle("Text_label_")}>Email Address</Label>
            <p className={cn(bubbleStyle("Text_body_"), "text-sm")}>{user?.email ?? "—"}</p>
          </div>
        </div>

        {recoveryModeActive ? (
          <section className="flex flex-col gap-4 border-t border-border pt-4">
            <p className={cn(bubbleStyle("Text_body_"), "text-sm font-medium")}>
              Recovery Fields (shown for Recovery sub-mode — all data is private)
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-sobriety-date" className={bubbleStyle("Text_label_")}>
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
          </section>
        ) : null}
      </div>

      <SettingsAboutYouSection form={aboutYouForm} onChange={updateAboutYouField} />

      <SettingsKnowYourselfSection profile={profile} />

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
  );
}
