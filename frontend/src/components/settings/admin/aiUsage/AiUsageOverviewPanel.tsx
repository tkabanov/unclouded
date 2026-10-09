import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Clock, DollarSign, Users, type LucideIcon } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AiUsageFilters,
  ALL_TIERS,
  type CustomRange,
  type PeriodChoice,
  type TierFilter,
} from "@/components/settings/admin/aiUsage/AiUsageFilters";
import {
  AI_TIER_LABELS,
  fetchAiUsageOverview,
  type AiUsageKpis,
  type AiUsageOverview,
} from "@/lib/settings/admin/adminAiUsageApi";
import {
  formatDurationMmSs,
  formatPctChange,
  formatUsd,
  pctChange,
  resolvePeriod,
} from "@/lib/settings/admin/aiUsagePeriod";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 173 58% 39%))",
  "hsl(var(--chart-3, 197 37% 24%))",
  "hsl(var(--chart-4, 43 74% 49%))",
  "hsl(var(--muted-foreground))",
];

const MODE_LABELS = { text: "Text", voice: "Voice", other: "Other (not limited)" } as const;

function KpiCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: number | null;
  icon: LucideIcon;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p
          className={cn(
            "mt-1 text-xs",
            change == null ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {formatPctChange(change)}
        </p>
      </CardContent>
    </Card>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function kpiChange(
  current: AiUsageKpis,
  prior: AiUsageKpis,
  key: keyof AiUsageKpis,
): number | null {
  return pctChange(current[key], prior[key]);
}

export default function AiUsageOverviewPanel() {
  const [period, setPeriod] = useState<PeriodChoice>("30d");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [tier, setTier] = useState<TierFilter>(ALL_TIERS);
  const [data, setData] = useState<AiUsageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolved = useMemo(() => {
    if (period === "custom") return customRange;
    return resolvePeriod(period);
  }, [period, customRange]);

  useEffect(() => {
    if (!resolved) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const overview = await fetchAiUsageOverview({
          from: resolved.from,
          to: resolved.to,
          tier: tier === ALL_TIERS ? null : tier,
        });
        if (!cancelled) setData(overview);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Couldn't load AI usage.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolved, tier]);

  const hasData =
    data != null && (data.kpis.sessions > 0 || data.kpis.spendUsd > 0 || data.kpis.activeUsers > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AiUsageFilters
          period={period}
          onPeriodChange={setPeriod}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          tier={tier}
          onTierChange={setTier}
        />
        <Badge variant="outline">Costs are estimated · UTC dates</Badge>
      </div>

      {data?.dataSince ? (
        <p className="text-xs text-muted-foreground">
          AI cost tracking started on {data.dataSince.slice(0, 10)}; earlier activity has no cost data.
        </p>
      ) : null}

      {!resolved ? (
        <Alert>
          <AlertDescription>Pick a start and end date to load usage.</AlertDescription>
        </Alert>
      ) : error && !data ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : data ? (
        <div className={cn("space-y-6", loading && "opacity-60")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="AI sessions"
              value={data.kpis.sessions.toLocaleString()}
              change={kpiChange(data.kpis, data.kpis.prior, "sessions")}
              icon={Activity}
            />
            <KpiCard
              label="Active users"
              value={data.kpis.activeUsers.toLocaleString()}
              change={kpiChange(data.kpis, data.kpis.prior, "activeUsers")}
              icon={Users}
            />
            <KpiCard
              label="Estimated AI spend"
              value={formatUsd(data.kpis.spendUsd)}
              change={kpiChange(data.kpis, data.kpis.prior, "spendUsd")}
              icon={DollarSign}
            />
            <KpiCard
              label="Avg cost / session"
              value={formatUsd(data.kpis.avgCostPerSessionUsd)}
              change={kpiChange(data.kpis, data.kpis.prior, "avgCostPerSessionUsd")}
              icon={DollarSign}
            />
          </div>

          {!hasData ? (
            <Alert>
              <AlertDescription>No AI usage recorded for this period and plan.</AlertDescription>
            </Alert>
          ) : null}

          <Section title="Sessions and spend by day">
            {hasData ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.daily} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
                    <YAxis yAxisId="sessions" allowDecimals={false} fontSize={12} width={32} />
                    <YAxis
                      yAxisId="spend"
                      orientation="right"
                      tickFormatter={(v: number) => `$${v}`}
                      fontSize={12}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === "Spend (est.)" ? formatUsd(value) : value
                      }
                    />
                    <Legend />
                    <Bar
                      yAxisId="spend"
                      dataKey="spendUsd"
                      name="Spend (est.)"
                      fill={CHART_COLORS[3]}
                      radius={[3, 3, 0, 0]}
                    />
                    <Line
                      yAxisId="sessions"
                      dataKey="sessions"
                      name="Sessions"
                      stroke={CHART_COLORS[0]}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart>No data for this period.</EmptyChart>
            )}
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Spend by mode" hint="“Other” covers insights, PDFs and tests; it is not limited.">
              {data.byMode.some((m) => m.spendUsd > 0) ? (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byMode.map((m) => ({ ...m, name: MODE_LABELS[m.mode] }))}
                        dataKey="spendUsd"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={80}
                      >
                        {data.byMode.map((m, i) => (
                          <Cell key={m.mode} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatUsd(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart>No spend recorded.</EmptyChart>
              )}
              <ul className="mt-2 space-y-1 text-sm">
                {data.byMode.map((m) => (
                  <li key={m.mode} className="flex justify-between">
                    <span>{MODE_LABELS[m.mode]}</span>
                    <span className="text-muted-foreground">
                      {m.sessions} sessions · {formatUsd(m.spendUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Usage by plan">
              <ul className="space-y-3">
                {data.byPlan.map((p) => {
                  const max = Math.max(...data.byPlan.map((x) => x.spendUsd), 0.000001);
                  return (
                    <li key={p.tier} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{AI_TIER_LABELS[p.tier]}</span>
                        <span className="text-muted-foreground">
                          {p.sessions} sessions · {formatUsd(p.spendUsd)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.round((p.spendUsd / max) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>

          <Section title="Spend by model" hint="Cost is estimated from the model price table.">
            {data.byModel.length === 0 ? (
              <EmptyChart>No model usage recorded.</EmptyChart>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Model</th>
                      <th className="py-2 pr-4 text-right">Sessions</th>
                      <th className="py-2 pr-4 text-right">Spend</th>
                      <th className="py-2 text-right">Cost / session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byModel.map((m) => (
                      <tr key={`${m.provider}:${m.model}`} className="border-t border-border">
                        <td className="py-2 pr-4">
                          {m.model}{" "}
                          <span className="text-xs text-muted-foreground">{m.provider}</span>
                          {m.pricingMissing ? (
                            <Badge variant="outline" className="ml-2">
                              no price set
                            </Badge>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4 text-right">{m.sessions}</td>
                        <td className="py-2 pr-4 text-right">{formatUsd(m.spendUsd)}</td>
                        <td className="py-2 text-right">{formatUsd(m.costPerSessionUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Section title="Top AI users by spend">
                {data.topUsers.length === 0 ? (
                  <EmptyChart>No users in this period.</EmptyChart>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-4">User</th>
                          <th className="py-2 pr-4">Plan</th>
                          <th className="py-2 pr-4 text-right">Sessions</th>
                          <th className="py-2 text-right">Spend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topUsers.map((u) => (
                          <tr key={u.userId} className="border-t border-border">
                            <td className="py-2 pr-4">{u.displayName}</td>
                            <td className="py-2 pr-4">{AI_TIER_LABELS[u.currentTier]}</td>
                            <td className="py-2 pr-4 text-right">{u.sessions}</td>
                            <td className="py-2 text-right">{formatUsd(u.spendUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </div>

            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <Clock className="h-4 w-4 text-primary" aria-hidden />
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Avg text session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatDurationMmSs(data.avgDurationSeconds.text)}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <Clock className="h-4 w-4 text-primary" aria-hidden />
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Avg voice session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatDurationMmSs(data.avgDurationSeconds.voice)}
                  </p>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground">
                Duration is approximate: session start to its end, or to the last AI call.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
