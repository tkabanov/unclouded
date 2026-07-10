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
      <div className="text-sm text-muted-foreground">
        Loading notifications…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-6 p-6")}
      >
        <header className="space-y-1">
          <h2
            className={bubbleStyle("Text_heading_3_")}
          >
            Notifications
          </h2>
          <p
            className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}
          >
            Set how often you&apos;d like check-in reminders and other nudges from Unclouded.
          </p>
        </header>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="notification-frequency"
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
