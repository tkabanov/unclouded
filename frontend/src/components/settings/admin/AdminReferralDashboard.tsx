import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchProgramReferralMetrics,
  type ProgramReferralMetrics,
} from "@/lib/settings/admin/referralPartnerStats";

function MetricCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function defaultPeriodStart(): string {
  const d = new Date();
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

function defaultPeriodEnd(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminReferralDashboard() {
  const [metrics, setMetrics] = useState<ProgramReferralMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const startIso = periodStart ? `${periodStart}T00:00:00.000Z` : null;
    const endIso = periodEnd ? `${periodEnd}T23:59:59.999Z` : null;
    fetchProgramReferralMetrics({ periodStart: startIso, periodEnd: endIso })
      .then((result) => {
        if (!cancelled) setMetrics(result);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load referral dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodStart, periodEnd]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
            <Link to="/admin/referral-partners">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Partners
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Referral Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Program-wide partner referral volume and subscription mix (B2B partners only).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="grid gap-1">
          <Label htmlFor="period-start">Period start</Label>
          <Input
            id="period-start"
            type="date"
            className="h-9 w-40"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="period-end">Period end</Label>
          <Input
            id="period-end"
            type="date"
            className="h-9 w-40"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </div>
      </div>

      {loading || !metrics ? (
        <p className="text-sm text-muted-foreground">Loading metrics…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total partners"
              value={metrics.totalPartners}
              hint={`${metrics.activePartners} active · ${metrics.inactivePartners} inactive`}
            />
            <MetricCard label="Total referred users" value={metrics.totalReferredUsers} />
            <MetricCard
              label="New referrals in period"
              value={metrics.newReferralsInPeriod}
              hint="Attributed signups in selected dates"
            />
            <MetricCard
              label="Converted (Pro + Premium)"
              value={metrics.proUsers + metrics.premiumUsers}
              hint="Currently on a paid tier"
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Subscription segmentation (referred)
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Free" value={metrics.freeUsers} hint="Referred but still Free" />
              <MetricCard label="Pro" value={metrics.proUsers} />
              <MetricCard label="Premium" value={metrics.premiumUsers} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Status (referred)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Active (paid)" value={metrics.activeUsers} />
              <MetricCard label="Canceled / non-active" value={metrics.canceledUsers} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
