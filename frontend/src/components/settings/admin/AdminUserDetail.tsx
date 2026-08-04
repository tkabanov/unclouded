import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchAdminUserDetail,
  setAdminUserActive,
} from "@/lib/settings/admin/adminUsersApi";
import {
  adminUserTypeLabel,
  type AdminUserDetail,
} from "@/lib/settings/admin/adminUserType";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null | undefined): string {
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

type Props = {
  userId: string;
  onBack: () => void;
  onStatusChanged: () => void;
};

export default function AdminUserDetailPanel({ userId, onBack, onStatusChanged }: Props) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const aboutEntries = Object.entries(user.aboutYou ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to users
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

      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-3 p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className={bubbleStyle("Text_heading_3_")}>{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email ?? "—"}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{adminUserTypeLabel(user.type)}</Badge>
            <Badge variant={user.isActive ? "outline" : "destructive"}>{user.status}</Badge>
          </div>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Date joined</dt>
            <dd>{formatDate(user.dateJoined)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account type</dt>
            <dd>{user.accountType}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Timezone</dt>
            <dd>{user.timezone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Enterprise tier</dt>
            <dd>{user.enterpriseTier ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Enrollment date</dt>
            <dd>{formatDate(user.enrollmentDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Workplace ID</dt>
            <dd className="break-all font-mono text-xs">{user.workplaceId ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {aboutEntries.length > 0 ? (
        <section className={cn(bubbleStyle("Group_card_muted_"), "space-y-2 p-6")}>
          <h4 className="font-semibold">Settings / About you</h4>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {aboutEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className={cn(bubbleStyle("Group_card_muted_"), "space-y-2 p-6")}>
        <h4 className="font-semibold">Flags & activity</h4>
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
          <p className="text-xs text-muted-foreground">{user.fingerprintStatus.summary}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Last journal: {formatDate(user.activity.lastJournalAt)} · Last chat:{" "}
          {formatDate(user.activity.lastChatSessionAt)} · Last coach booking:{" "}
          {formatDate(user.activity.lastCoachBookingAt)}
        </p>
      </section>

      <section className={cn(bubbleStyle("Group_card_muted_"), "space-y-2 p-6")}>
        <h4 className="font-semibold">Bookings & credits</h4>
        <p className="text-sm">
          1:1 sessions: <strong>{user.bookings.oneOnOne}</strong>
          <span className="mx-2 text-muted-foreground">·</span>
          Group sessions: <strong>{user.bookings.group}</strong>
          <span className="mx-2 text-muted-foreground">·</span>
          Premium credits: <strong>{user.creditsBalance}</strong>
        </p>
        {user.subscription ? (
          <p className="text-xs text-muted-foreground">
            Subscription: {user.subscription.planTier} / {user.subscription.status}
            {user.subscription.currentPeriodEnd
              ? ` · period end ${formatDate(user.subscription.currentPeriodEnd)}`
              : ""}
          </p>
        ) : null}
        {user.creditLedger.length > 0 ? (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-muted-foreground">Credit ledger (latest 50)</p>
            <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border border-border text-xs">
              {user.creditLedger.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 px-3 py-2">
                  <span>
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta} · {entry.reason}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(entry.createdAt)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No credit ledger entries.</p>
        )}
      </section>

      <section className={cn(bubbleStyle("Group_card_muted_"), "space-y-3 p-6")}>
        <h4 className="font-semibold">Paths & sessions</h4>
        {user.paths.length === 0 ? (
          <p className="text-sm text-muted-foreground">No path enrollments.</p>
        ) : (
          <ul className="divide-y rounded-lg border border-border">
            {user.paths.map((path) => (
              <li key={path.enrollmentId} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
                <span className="font-medium">{path.pathName}</span>
                <span className="text-xs text-muted-foreground">
                  {path.status ?? "—"} · {path.tier ?? "—"} · sessions done{" "}
                  {path.completedSessionsCount} · enrolled {formatDate(path.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cn(bubbleStyle("Group_card_muted_"), "space-y-3 p-6")}>
        <h4 className="font-semibold">Assessment & reassessment</h4>
        {user.assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assessment history.</p>
        ) : (
          <ul className="divide-y rounded-lg border border-border">
            {user.assessments.map((row) => (
              <li key={row.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
                <span className="font-medium">
                  {row.isInitial ? "Initial" : "Reassessment"}
                  {row.classification ? ` — ${row.classification}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(row.assessmentDate)}
                  {row.trajectoryType ? ` · ${row.trajectoryType}` : ""}
                  {row.stabilityScore != null
                    ? ` · S${row.stabilityScore} P${row.performanceScore ?? "—"} A${row.alignmentScore ?? "—"}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
