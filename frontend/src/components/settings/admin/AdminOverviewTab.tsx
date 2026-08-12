import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Building2,
  CreditCard,
  Repeat,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAdminOverview,
  formatDelta,
  type AdminOverviewSnapshot,
  type CrisisRange,
} from "@/lib/settings/admin/adminOverviewApi";
import { cn } from "@/lib/utils";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 173 58% 39%))",
  "hsl(var(--chart-3, 197 37% 24%))",
  "hsl(var(--muted-foreground))",
];

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
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
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function deltaClass(value: number | null): string {
  if (value == null) return "text-foreground";
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-destructive";
  return "text-foreground";
}

export default function AdminOverviewTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminOverviewSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [crisisRange, setCrisisRange] = useState<CrisisRange>("week");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const snapshot = await fetchAdminOverview(user.id, crisisRange);
        if (!cancelled) setStats(snapshot);
      } catch {
        if (!cancelled) toast.error("Couldn't load admin overview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, crisisRange]);

  const seatUtilizationPercent =
    stats && stats.enterpriseSeatsPurchased > 0
      ? Math.round((stats.enterpriseSeatsUsed / stats.enterpriseSeatsPurchased) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Admin overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform engagement, growth and clinical quality indicators.
        </p>
      </header>

      {loading || !stats ? (
        <p className="text-sm text-muted-foreground">Loading overview…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="Total users" value={String(stats.totalUsers)} icon={Users} />
            <KpiCard
              label="DAU / MAU"
              value={`${stats.dau} / ${stats.mau}`}
              hint={`${stats.stickinessPercent}% stickiness`}
              icon={Activity}
            />
            <KpiCard
              label="Median sessions / 30d"
              value={String(stats.medianSessions30d)}
              hint="per active member"
              icon={Repeat}
            />
            <KpiCard
              label="Path completion"
              value={`${stats.pathCompletionPercent}%`}
              hint={`${stats.pathCompleted} of ${stats.pathStarted} started`}
              icon={BookOpen}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                  <Building2 className="h-4 w-4 text-primary" aria-hidden />
                  Enterprise seat utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-3xl font-bold text-foreground">{seatUtilizationPercent}%</p>
                <Progress value={seatUtilizationPercent} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {stats.enterpriseSeatsUsed} of {stats.enterpriseSeatsPurchased} purchased seats
                  used across {stats.enterpriseContractsActive} active contracts
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                  <CreditCard className="h-4 w-4 text-primary" aria-hidden />
                  Subscription distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                {stats.subscriptionDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subscription data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.subscriptionDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {stats.subscriptionDistribution.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold tracking-tight">
                  Classification distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-60">
                {stats.classificationDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No classification data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.classificationDistribution.map((row) => ({
                        name: row.label,
                        count: row.count,
                      }))}
                      layout="vertical"
                      margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold tracking-tight">
                  Crisis event volume
                </CardTitle>
                <div className="flex gap-1">
                  {(["day", "week", "month"] as const).map((range) => (
                    <Button
                      key={range}
                      type="button"
                      size="sm"
                      variant={crisisRange === range ? "default" : "outline"}
                      className="h-7 px-2 text-xs capitalize"
                      onClick={() => setCrisisRange(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-3xl font-bold text-foreground">{stats.crisisTotal}</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.crisisSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold tracking-tight">
                Assessment trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                Average score change between the initial assessment and the 90-day reassessment (
                {stats.assessmentTrends.reassessedMembers} members reassessed).
              </p>
              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    ["Stability", stats.assessmentTrends.stabilityDelta],
                    ["Performance", stats.assessmentTrends.performanceDelta],
                    ["Alignment", stats.assessmentTrends.alignmentDelta],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn("text-2xl font-bold", deltaClass(value))}>
                      {formatDelta(value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            {stats.publishedPaths} published paths live for members.
          </p>
        </>
      )}
    </div>
  );
}
