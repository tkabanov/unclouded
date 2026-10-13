import { useEffect, useState } from "react";

import {
  fetchAdminUserReferralStats,
  type AdminUserReferralStats,
} from "@/lib/settings/admin/referralProgramAdminApi";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="space-y-1" title={hint}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

/** NCLDD-56 — B2C invite activity of one user (admin only). */
export default function AdminUserReferralActivityCard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<AdminUserReferralStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    setFailed(false);
    fetchAdminUserReferralStats(userId)
      .then((next) => {
        if (!cancelled) setStats(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Referral activity (Invite a friend)</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        People who signed up with this user's link. Link visits are anonymous (once per browser per
        day) and are not conversions.
      </p>
      {failed ? (
        <p className="text-sm text-muted-foreground">Referral activity isn't available right now.</p>
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Link visits" value={stats.invites.linkVisits} />
            <Stat label="Invited (accounts created)" value={stats.invites.invited} />
            <Stat label="Registered (email confirmed)" value={stats.invites.registered} />
            <Stat
              label="Paid Pro / Premium (since launch)"
              value={stats.invites.paidProPremium}
              hint="Invitees with at least one paid Pro or Premium invoice recorded since the referral program launched (refunded ones included)."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Coach credits earned" value={stats.credits.earned} />
            <Stat label="Used" value={stats.credits.used} />
            <Stat label="Taken back" value={stats.credits.takenBack} hint="Removed after a refund or chargeback." />
            <Stat label="Available" value={stats.credits.available} />
          </div>
          {stats.invites.movedToPartner > 0 ? (
            <p className="text-xs text-muted-foreground">
              {stats.invites.movedToPartner} invitee{stats.invites.movedToPartner === 1 ? " was" : "s were"} later
              attributed to a referral partner and {stats.invites.movedToPartner === 1 ? "is" : "are"} not counted
              above.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
