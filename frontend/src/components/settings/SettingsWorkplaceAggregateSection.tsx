import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import ManagerTeamAggregatePanel from "@/components/employer/ManagerTeamAggregatePanel";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  fetchManagerAggregate,
  type ManagerAggregateSnapshot,
} from "@/lib/employer/managerAggregateApi";
import {
  loadWorkplaceMemberSettings,
  saveManagerAggregateOptIn,
  type WorkplaceMemberSettings,
} from "@/lib/employer/workplaceMemberSettingsApi";
import { useAuth } from "@/hooks/useAuth";
import { useHrWorkplaces } from "@/hooks/useHrWorkplaces";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export function shouldShowWorkplaceAggregateOptIn(params: {
  workplaceId: string | null | undefined;
  isHrContact: boolean;
}): boolean {
  return Boolean(params.workplaceId) || params.isHrContact;
}

export function SettingsWorkplaceAggregateOptInSection() {
  const { user } = useAuth();
  const { isHrContact, loading: hrWorkplacesLoading } = useHrWorkplaces();
  const [settings, setSettings] = useState<WorkplaceMemberSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [optIn, setOptIn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setSettingsLoading(true);

    void loadWorkplaceMemberSettings(user.id)
      .then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        setOptIn(loaded.managerAggregateOptIn);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load workplace privacy settings.");
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleOptInChange = useCallback(
    async (checked: boolean) => {
      if (!user || saving) return;
      setOptIn(checked);
      setSaving(true);
      try {
        await saveManagerAggregateOptIn(user.id, checked);
        setSettings((prev) =>
          prev ? { ...prev, managerAggregateOptIn: checked } : prev,
        );
        toast.success(checked ? "You opted in to team aggregates." : "You opted out of team aggregates.");
      } catch {
        setOptIn((prev) => !prev);
        toast.error("Couldn't update your team aggregate preference.");
      } finally {
        setSaving(false);
      }
    },
    [saving, user],
  );

  if (settingsLoading || hrWorkplacesLoading) {
    return null;
  }

  if (
    !shouldShowWorkplaceAggregateOptIn({
      workplaceId: settings?.workplaceId,
      isHrContact,
    })
  ) {
    return null;
  }

  const isHrOnly = isHrContact && !settings?.workplaceId;

  return (
    <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-4 p-6")}>
      <header className="space-y-1">
        <h2 className={bubbleStyle("Text_heading_2_")}>Workplace team aggregate</h2>
        <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
          {isHrOnly
            ? "Choose whether your anonymized activity may be included in workplace wellbeing aggregates. No individual scores or identities are shared."
            : "If your manager enables team wellbeing views, you can choose whether your anonymized data may be included in their direct-report aggregate. Managers never see individual scores or who opted in."}
        </p>
      </header>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="manager-aggregate-opt-in" className={bubbleStyle("Text_label_")}>
            Include my anonymized data
          </Label>
          <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
            Aggregates appear only when at least five direct reports opt in.
          </p>
        </div>
        <Switch
          id="manager-aggregate-opt-in"
          checked={optIn}
          disabled={saving}
          onCheckedChange={(checked) => void handleOptInChange(checked)}
        />
      </div>
    </div>
  );
}

export function SettingsManagerTeamAggregateSection({
  managesATeam,
}: {
  managesATeam: boolean | null;
}) {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<ManagerAggregateSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || managesATeam !== true) return;
    let cancelled = false;
    setLoading(true);

    void fetchManagerAggregate()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load team aggregate metrics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [managesATeam, user]);

  if (managesATeam !== true) {
    return null;
  }

  return (
    <ManagerTeamAggregatePanel snapshot={snapshot} loading={loading} />
  );
}
