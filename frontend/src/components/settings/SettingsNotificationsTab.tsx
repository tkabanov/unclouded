import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NOTIFICATIONS_CARD_HEADER_BUBBLE_ID,
  NOTIFICATIONS_CARD_SUBTITLE_BUBBLE_ID,
  NOTIFICATIONS_CARD_TITLE_BUBBLE_ID,
  NOTIFICATIONS_FORM_BUBBLE_ID,
  NOTIFICATIONS_FORM_CARD_BUBBLE_ID,
  NOTIFICATIONS_FREQ_LABEL_BUBBLE_ID,
  NOTIFICATIONS_FREQ_SELECT_BUBBLE_ID,
  NOTIFICATIONS_PANEL_BUBBLE_ID,
  NOTIFICATIONS_SAVE_BTN_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  loadNotificationFrequency,
  NOTIFICATION_FREQUENCY_OPTIONS,
  NOTIFICATION_FREQUENCY_PLACEHOLDER,
  saveNotificationFrequency,
  type NotificationFrequency,
} from "@/lib/settings/notificationsApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsNotificationsTab() {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<NotificationFrequency | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    loadNotificationFrequency(user.id)
      .then((value) => {
        if (!cancelled) setFrequency(value);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load notification settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user || saving || !frequency) return;
    setSaving(true);
    try {
      await saveNotificationFrequency(user.id, frequency);
      const saved = await loadNotificationFrequency(user.id);
      setFrequency(saved);
      toast.success("Notification preferences saved.");
    } catch {
      toast.error("Couldn't save notification preferences.");
    } finally {
      setSaving(false);
    }
  }, [frequency, saving, user]);

  if (loading) {
    return (
      <div data-bubble-id={NOTIFICATIONS_PANEL_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading notifications…
      </div>
    );
  }

  return (
    <div data-bubble-id={NOTIFICATIONS_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
      <div
        data-bubble-id={NOTIFICATIONS_FORM_CARD_BUBBLE_ID}
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
      >
        <header data-bubble-id={NOTIFICATIONS_CARD_HEADER_BUBBLE_ID} className="space-y-1">
          <h2
            data-bubble-id={NOTIFICATIONS_CARD_TITLE_BUBBLE_ID}
            className={bubbleStyle("Text_heading_3_")}
          >
            Notifications
          </h2>
          <p
            data-bubble-id={NOTIFICATIONS_CARD_SUBTITLE_BUBBLE_ID}
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
          >
            Set how often you&apos;d like check-in reminders and other nudges from Unclouded.
          </p>
        </header>

        <div data-bubble-id={NOTIFICATIONS_FORM_BUBBLE_ID} className="flex flex-col gap-2">
          <Label
            htmlFor="notification-frequency"
            data-bubble-id={NOTIFICATIONS_FREQ_LABEL_BUBBLE_ID}
            className={bubbleStyle("Text_label_")}
          >
            Check-In Reminder Frequency
          </Label>
          <Select
            value={frequency || undefined}
            onValueChange={(value) => setFrequency(value as NotificationFrequency)}
          >
            <SelectTrigger
              id="notification-frequency"
              data-bubble-id={NOTIFICATIONS_FREQ_SELECT_BUBBLE_ID}
              className={bubbleStyle("Input_default_")}
            >
              <SelectValue placeholder={NOTIFICATION_FREQUENCY_PLACEHOLDER} />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            data-bubble-id={NOTIFICATIONS_SAVE_BTN_BUBBLE_ID}
            className={bubbleStyle("Button_primary_")}
            disabled={saving || !frequency}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save Notification Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
