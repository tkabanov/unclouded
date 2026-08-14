import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useHrWorkplaces } from "@/hooks/useHrWorkplaces";
import { TIER_LABELS, type TierSlug } from "@/lib/enums/tier";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/lib/userProfile";
import { isEnterpriseAccountType } from "@/lib/userProfile/onboardingStatus";
import {
  isValidEnrollmentCodeFormat,
  normalizeEnrollmentCode,
} from "@/lib/workplace/enrollmentCodeFormat";
import { redeemWorkplaceEnrollmentCode } from "@/lib/workplace/workplaceEnrollmentApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export type EnrollmentCodeSectionMode = "redeem" | "covered" | "hidden";

export function resolveEnrollmentCodeSectionMode(params: {
  accountType: string | null | undefined;
  isPortalOnlyHr: boolean;
}): EnrollmentCodeSectionMode {
  if (params.isPortalOnlyHr) return "hidden";
  if (isEnterpriseAccountType(params.accountType)) return "covered";
  return "redeem";
}

export default function SettingsEnrollmentCodeSection() {
  const { user } = useAuth();
  const { profile, refresh } = useUserProfile();
  const { isPortalOnlyHr, loading: hrLoading } = useHrWorkplaces();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);

  const mode = resolveEnrollmentCodeSectionMode({
    accountType: profile?.accountType,
    isPortalOnlyHr,
  });

  useEffect(() => {
    if (mode !== "covered" || !user?.id) {
      setOrgName(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: row } = await supabase
        .from("profiles")
        .select("workplaceId")
        .eq("id", user.id)
        .maybeSingle();
      const workplaceId = (row as { workplaceId?: string | null } | null)?.workplaceId;
      if (!workplaceId || cancelled) return;
      const { data: workplace } = await supabase
        .from("workplace")
        .select("name")
        .eq("id", workplaceId)
        .maybeSingle();
      if (!cancelled) {
        setOrgName((workplace as { name?: string } | null)?.name?.trim() || null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, user?.id]);

  if (hrLoading || mode === "hidden") return null;

  if (mode === "covered") {
    const tier = (profile?.enterpriseTier ?? profile?.tier ?? "pro").toLowerCase() as TierSlug;
    const tierLabel = TIER_LABELS[tier] ?? "Pro";
    const provider = orgName ?? "your organization";
    return (
      <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-2 p-6")}>
        <header className="space-y-1">
          <h2 className={bubbleStyle("Text_heading_2_")}>Workplace enrollment</h2>
          <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
            Provided by {provider} · {tierLabel}. Individual plans and checkout are not used on this
            account.
          </p>
        </header>
      </div>
    );
  }

  const normalized = normalizeEnrollmentCode(code);
  const canSubmit = isValidEnrollmentCodeFormat(normalized) && !submitting;

  const handleRedeem = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await redeemWorkplaceEnrollmentCode(normalized);
      setCode("");
      await refresh({ silent: true }).catch(() => undefined);
      toast.success(
        result.alreadyEnrolled
          ? `You're already enrolled with ${result.workplaceName || "your organization"}.`
          : `Joined ${result.workplaceName || "your organization"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't redeem that code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-4 p-6")}>
      <header className="space-y-1">
        <h2 className={bubbleStyle("Text_heading_2_")}>Workplace enrollment</h2>
        <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
          If your employer provides Uncloud360, enter the enrollment code from HR to unlock
          organization-covered access.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-enrollment-code" className={bubbleStyle("Text_label_")}>
          Enrollment code
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="settings-enrollment-code"
            placeholder="e.g. ACME26"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canSubmit) {
                event.preventDefault();
                void handleRedeem();
              }
            }}
            className={cn(bubbleStyle("Input_default_"), "uppercase")}
          />
          <Button
            type="button"
            data-style-ref="Button_primary_"
            className={bubbleStyle("Button_primary_")}
            disabled={!canSubmit}
            onClick={() => void handleRedeem()}
          >
            {submitting ? "Verifying…" : "Add code"}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
