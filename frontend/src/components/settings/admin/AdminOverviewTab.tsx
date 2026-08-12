import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchAdminAnalytics } from "@/lib/settings/admin/adminAnalyticsApi";
import { fetchAdminPaths } from "@/lib/settings/admin/adminPathsApi";
import { fetchAdminWorkplaces } from "@/lib/settings/admin/adminWorkplacesApi";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type OverviewStats = {
  totalUsers: number;
  publishedPaths: number;
  organizations: number;
  premiumSubscribers: number;
};

function StatCard({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to?: string;
}) {
  const body = (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
  if (!to) return body;
  return (
    <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  );
}

export default function AdminOverviewTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [analytics, paths, workplaces] = await Promise.all([
          fetchAdminAnalytics(),
          user ? fetchAdminPaths(user.id) : Promise.resolve([]),
          user
            ? fetchAdminWorkplaces(user.id)
            : Promise.resolve({ workplaces: [], dataSource: "table" as const }),
        ]);
        if (cancelled) return;
        setStats({
          totalUsers: analytics.totalUsers,
          publishedPaths: paths.filter((p) => p.isActive).length,
          organizations: workplaces.workplaces.filter((w) => w.isActive).length,
          premiumSubscribers: analytics.premiumUsers,
        });
      } catch {
        if (!cancelled) toast.error("Couldn't load admin overview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Admin overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage platform users, paths, and enterprise organizations.
        </p>
      </header>

      {loading || !stats ? (
        <p className="text-sm text-muted-foreground">Loading overview…</p>
      ) : (
        <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4")}>
          <StatCard label="Total users" value={String(stats.totalUsers)} to="/admin/users" />
          <StatCard
            label="Published paths"
            value={String(stats.publishedPaths)}
            to="/admin/paths"
          />
          <StatCard
            label="Organizations"
            value={String(stats.organizations)}
            to="/admin/organizations"
          />
          <StatCard
            label="Premium subscribers"
            value={String(stats.premiumSubscribers)}
            to="/admin/analytics"
          />
        </div>
      )}
    </div>
  );
}
