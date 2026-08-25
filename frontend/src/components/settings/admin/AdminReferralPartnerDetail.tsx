import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddReferralPartnerPopup from "@/components/settings/admin/AddReferralPartnerPopup";
import {
  fetchAdminReferralPartner,
  partnerTypeLabel,
  referralPartnerToForm,
  updateAdminReferralPartner,
  type AdminReferralPartnerFormState,
  type AdminReferralPartnerRecord,
} from "@/lib/settings/admin/referralPartnersApi";
import {
  aggregatePartnerStats,
  fetchPartnerReferredUsers,
  filterPartnerReferredUsers,
  formatPartnerConversionRate,
  PARTNER_CONVERSION_RATE_TOOLTIP,
  type PartnerReferredUserRow,
  type ReferredUserStatusFilter,
  type ReferredUserTierFilter,
} from "@/lib/settings/admin/referralPartnerStats";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Metric({
  label,
  value,
  title,
}: {
  label: string;
  value: string | number;
  title?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-3" title={title}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export default function AdminReferralPartnerDetail() {
  const { partnerId = "" } = useParams<{ partnerId: string }>();
  const [partner, setPartner] = useState<AdminReferralPartnerRecord | null>(null);
  const [users, setUsers] = useState<PartnerReferredUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<ReferredUserTierFilter>("all");
  const [status, setStatus] = useState<ReferredUserStatusFilter>("all");

  const reload = useCallback(async () => {
    if (!partnerId) return;
    const [p, rows] = await Promise.all([
      fetchAdminReferralPartner(partnerId),
      fetchPartnerReferredUsers(partnerId),
    ]);
    setPartner(p);
    setUsers(rows);
  }, [partnerId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load partner.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const stats = useMemo(() => aggregatePartnerStats(users), [users]);
  const filtered = useMemo(
    () => filterPartnerReferredUsers(users, { search, tier, status }),
    [users, search, tier, status],
  );

  const handleCopy = useCallback(async () => {
    if (!partner) return;
    try {
      const url = `${window.location.origin}/signup?ref=${encodeURIComponent(partner.referralCode)}`;
      await navigator.clipboard.writeText(url);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Couldn't copy link.");
    }
  }, [partner]);

  const handleSave = useCallback(
    async (form: AdminReferralPartnerFormState) => {
      if (!partner || busy) return;
      setBusy(true);
      try {
        await updateAdminReferralPartner(partner.partnerId, form);
        toast.success("Partner updated.");
        await reload();
        setEditOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save partner.");
      } finally {
        setBusy(false);
      }
    },
    [busy, partner, reload],
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading partner…</p>;
  }

  if (!partner) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/referral-partners">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Partner not found.</p>
      </div>
    );
  }

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
            {partner.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {partnerTypeLabel(partner.type)} · {partner.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={partner.status === "active" ? "secondary" : "outline"}>
            {partner.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
            <Copy className="mr-1 h-4 w-4" />
            Copy link
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Profile</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Referral code</p>
            <p className="font-mono">{partner.referralCode}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tracking link</p>
            <p className="break-all text-xs">
              {`${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${partner.referralCode}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date added</p>
            <p>{formatDate(partner.createdAt)}</p>
          </div>
          {partner.contactInfo ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Contact</p>
              <p className="whitespace-pre-wrap">{partner.contactInfo}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Performance</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total referred" value={stats.totalReferred} />
          <Metric label="Free" value={stats.freeUsers} />
          <Metric label="Pro" value={stats.proUsers} />
          <Metric label="Premium" value={stats.premiumUsers} />
          <Metric label="Active" value={stats.activeUsers} />
          <Metric label="Canceled / non-active" value={stats.canceledUsers} />
          <Metric label="Paid conversions (ever)" value={stats.paidConversions} />
          <Metric
            label="Conversion rate"
            value={formatPartnerConversionRate(stats.conversionRate)}
            title={PARTNER_CONVERSION_RATE_TOOLTIP}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Referred users</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              className="h-9 w-48"
              placeholder="Search name / email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={tier} onValueChange={(v) => setTier(v as ReferredUserTierFilter)}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ReferredUserStatusFilter)}
            >
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="canceled">Canceled / non-active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No referred users match.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Registered</th>
                  <th className="px-3 py-2 font-medium">Referred</th>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Converted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.userId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        to={`/admin/users/${row.userId}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-3 py-2">{formatDate(row.registrationDate)}</td>
                    <td className="px-3 py-2">{formatDate(row.referralDate)}</td>
                    <td className="px-3 py-2 capitalize">{row.tier}</td>
                    <td className="px-3 py-2">{row.subscriptionStatus}</td>
                    <td className="px-3 py-2">{formatDate(row.conversionDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AddReferralPartnerPopup
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleSave}
        busy={busy}
        editPartnerId={partner.partnerId}
        initialForm={referralPartnerToForm(partner)}
      />
    </div>
  );
}
