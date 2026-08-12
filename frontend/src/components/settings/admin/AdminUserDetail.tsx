import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchAdminUserDetail,
  generateAdminPreCoachingBrief,
  setAdminUserActive,
} from "@/lib/settings/admin/adminUsersApi";
import {
  adminUserTypeLabel,
  type AdminUserDetail,
  type AdminUserSessionLog,
} from "@/lib/settings/admin/adminUserType";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function YesNo({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? "secondary" : "outline"}>{value ? "Yes" : "No"}</Badge>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function scoreLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)} / 5`;
}

function SessionLogList({
  title,
  rows,
}: {
  title: string;
  rows: AdminUserSessionLog[];
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">No sessions yet</p>
      ) : (
        <ul className="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border border-border text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {formatDateTime(row.scheduledAt ?? row.createdAt)}
              </span>
              <Badge variant="outline" className="capitalize">
                {row.status ?? "—"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Props = {
  userId: string;
  onBack: () => void;
  onStatusChanged: () => void;
};

export default function AdminUserDetailPanel({ userId, onBack, onStatusChanged }: Props) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefText, setBriefText] = useState("");

  const reload = useCallback(async () => {
    const detail = await fetchAdminUserDetail(userId);
    setUser(detail);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load user detail.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleToggle = useCallback(async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await setAdminUserActive(user.userId, !user.isActive);
      toast.success(user.isActive ? "User deactivated." : "User reactivated.");
      await reload();
      onStatusChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't update status.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [busy, onStatusChanged, reload, user]);

  const handleGenerateBrief = useCallback(async () => {
    if (!user || briefLoading) return;
    setBriefOpen(true);
    setBriefLoading(true);
    setBriefText("");
    try {
      const brief = await generateAdminPreCoachingBrief(user.userId);
      setBriefText(brief);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't generate pre-coaching brief.";
      toast.error(message);
      setBriefOpen(false);
    } finally {
      setBriefLoading(false);
    }
  }, [briefLoading, user]);

  const handleCopyBrief = useCallback(async () => {
    if (!briefText.trim()) return;
    try {
      await navigator.clipboard.writeText(briefText);
      toast.success("Brief copied to clipboard.");
    } catch {
      toast.error("Could not copy brief.");
    }
  }, [briefText]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to users
        </Button>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const aboutEntries = Object.entries(user.aboutYou ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  const currentPaths = user.paths.filter(
    (p) => (p.status ?? "").toLowerCase() === "active" || (p.status ?? "").toLowerCase() === "in_progress",
  );
  const previousPaths = user.paths.filter((p) => !currentPaths.includes(p));

  const initialAssessment = user.assessments.find((a) => a.isInitial) ?? null;
  const latestReassessment =
    user.assessments.find((a) => !a.isInitial) ?? null;

  const creditsUsed = user.creditLedger
    .filter((e) => e.delta < 0)
    .reduce((sum, e) => sum + Math.abs(e.delta), 0);

  const sessionLogs = user.sessionLogs ?? { oneOnOne: [], group: [] };

  const accountTypeLabel =
    (user.accountType || "individual").charAt(0).toUpperCase() +
    (user.accountType || "individual").slice(1).toLowerCase();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to users
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={briefLoading}
            onClick={() => void handleGenerateBrief()}
          >
            {briefLoading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            Generate Pre-Coaching Brief
          </Button>
          <Button
            type="button"
            variant={user.isActive ? "destructive" : "default"}
            size="sm"
            disabled={busy}
            onClick={() => void handleToggle()}
          >
            {user.isActive ? "Deactivate user" : "Activate user"}
          </Button>
        </div>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email ?? "—"}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{accountTypeLabel}</Badge>
          <Badge variant="outline">{adminUserTypeLabel(user.type)}</Badge>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              user.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {user.isActive ? "active" : "deactivated"}
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Name" value={user.name} />
            <ProfileField label="Email" value={user.email ?? "—"} />
            <ProfileField label="Role type" value={user.customerRoleType ?? "—"} />
            <ProfileField label="Primary pillar" value={user.primaryPillar ?? "—"} />
            <ProfileField label="Joined" value={formatDate(user.dateJoined)} />
            <ProfileField label="Timezone" value={user.timezone ?? "—"} />
            <ProfileField label="Enterprise tier" value={user.enterpriseTier ?? "—"} />
            <ProfileField label="Enrollment date" value={formatDate(user.enrollmentDate)} />
            <ProfileField
              label="Workplace ID"
              value={user.workplaceId ?? "—"}
            />
          </div>
        </Card>

        <Card title="Bookings & credits">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-center">
              <p className="text-2xl font-semibold tabular-nums">{user.bookings.group}</p>
              <p className="mt-1 text-xs text-muted-foreground">Group</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-center">
              <p className="text-2xl font-semibold tabular-nums">{user.bookings.oneOnOne}</p>
              <p className="mt-1 text-xs text-muted-foreground">1:1</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-center">
              <p className="text-2xl font-semibold tabular-nums">{creditsUsed}</p>
              <p className="mt-1 text-xs text-muted-foreground">Credits used</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Live credit balance: <strong>{user.creditsBalance}</strong>
            {user.subscription
              ? ` · Subscription: ${user.subscription.planTier} / ${user.subscription.status}${
                  user.subscription.currentPeriodEnd
                    ? ` · period end ${formatDateTime(user.subscription.currentPeriodEnd)}`
                    : ""
                }`
              : " · Live credit balance is tracked in the user's subscription state."}
          </p>
          {user.creditLedger.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Credit ledger (latest 50)</p>
              <ul className="max-h-40 divide-y overflow-y-auto rounded-lg border border-border text-xs">
                {user.creditLedger.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 px-3 py-2">
                    <span>
                      {entry.delta > 0 ? "+" : ""}
                      {entry.delta} · {entry.reason}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      <Card title="Paths">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current path
            </p>
            {currentPaths.length === 0 ? (
              <p className="mt-1 text-sm text-foreground">None active</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {currentPaths.map((path) => (
                  <li key={path.enrollmentId} className="text-sm">
                    <span className="font-medium">{path.pathName}</span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      · {path.status ?? "—"} · sessions {path.completedSessionsCount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Previous paths
            </p>
            {previousPaths.length === 0 ? (
              <p className="mt-1 text-sm text-foreground">No completed paths yet</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {previousPaths.map((path) => (
                  <li key={path.enrollmentId} className="text-sm">
                    <span className="font-medium">{path.pathName}</span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      · {path.status ?? "—"} · enrolled {formatDate(path.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card title="Session logs">
        <div className="grid gap-4 sm:grid-cols-2">
          <SessionLogList title="1:1 sessions" rows={sessionLogs.oneOnOne} />
          <SessionLogList title="Group sessions" rows={sessionLogs.group} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Initial assessment">
          {!initialAssessment ? (
            <p className="text-sm text-muted-foreground">Not completed</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Stability</p>
                  <p className="mt-1 text-sm font-semibold">
                    {scoreLabel(initialAssessment.stabilityScore)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <p className="mt-1 text-sm font-semibold">
                    {scoreLabel(initialAssessment.performanceScore)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alignment</p>
                  <p className="mt-1 text-sm font-semibold">
                    {scoreLabel(initialAssessment.alignmentScore)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Classification</p>
                <p className="mt-1 text-sm font-medium">
                  {initialAssessment.classification ?? "—"}
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card title="90-day reassessment">
          {!latestReassessment ? (
            <p className="text-sm text-muted-foreground">Not completed</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Stability</p>
                  <p className="mt-1 text-sm font-semibold">
                    {scoreLabel(latestReassessment.stabilityScore)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <p className="mt-1 text-sm font-semibold">
                    {scoreLabel(latestReassessment.performanceScore)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alignment</p>
                  <p className="mt-1 text-sm font-semibold">
                    {scoreLabel(latestReassessment.alignmentScore)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Classification</p>
                <p className="mt-1 text-sm font-medium">
                  {latestReassessment.classification ?? "—"}
                </p>
              </div>
              {latestReassessment.trajectoryType ? (
                <p className="text-xs text-muted-foreground">
                  Trajectory: {latestReassessment.trajectoryType}
                </p>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      {/* Extra sections beyond Lovable — kept and styled consistently */}
      <Card title="Flags & activity">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2">
            <dt>Crisis triggered</dt>
            <dd>
              <YesNo value={user.crisisTriggered} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Grief mode</dt>
            <dd>
              <YesNo value={user.griefModeActive} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Recovery mode</dt>
            <dd>
              <YesNo value={user.recoveryModeActive} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Fingerprint</dt>
            <dd>
              <YesNo value={user.fingerprintStatus.present} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Journaling active</dt>
            <dd>
              <YesNo value={user.activity.journaling} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Chatting active</dt>
            <dd>
              <YesNo value={user.activity.chatting} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Sessions active</dt>
            <dd>
              <YesNo value={user.activity.sessions} />
            </dd>
          </div>
        </dl>
        {user.fingerprintStatus.present && user.fingerprintStatus.summary ? (
          <p className="mt-3 text-xs text-muted-foreground">{user.fingerprintStatus.summary}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          Last journal: {formatDateTime(user.activity.lastJournalAt)} · Last chat:{" "}
          {formatDateTime(user.activity.lastChatSessionAt)} · Last coach booking:{" "}
          {formatDateTime(user.activity.lastCoachBookingAt)}
        </p>
      </Card>

      {aboutEntries.length > 0 ? (
        <Card title="Settings / About you">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {aboutEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {user.assessments.length > 2 ? (
        <Card title="Assessment history">
          <ul className="divide-y rounded-lg border border-border">
            {user.assessments.map((row) => (
              <li key={row.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
                <span className="font-medium">
                  {row.isInitial ? "Initial" : "Reassessment"}
                  {row.classification ? ` — ${row.classification}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(row.assessmentDate)}
                  {row.trajectoryType ? ` · ${row.trajectoryType}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pre-Coaching Brief</DialogTitle>
          </DialogHeader>
          {briefLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating brief from recent activity…
            </div>
          ) : (
            <Textarea
              readOnly
              value={briefText}
              className="min-h-[280px] font-mono text-xs"
              aria-label="Generated pre-coaching brief"
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={briefLoading || !briefText.trim()}
              onClick={() => void handleCopyBrief()}
            >
              <Copy className="mr-1 h-4 w-4" />
              Copy
            </Button>
            <Button type="button" onClick={() => setBriefOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
