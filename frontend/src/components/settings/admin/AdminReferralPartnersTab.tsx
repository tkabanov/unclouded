import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Copy, Pencil, UserCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddReferralPartnerPopup from "@/components/settings/admin/AddReferralPartnerPopup";
import {
  createAdminReferralPartner,
  fetchAdminReferralPartners,
  partnerTypeLabel,
  referralPartnerToForm,
  setReferralPartnerStatus,
  updateAdminReferralPartner,
  type AdminReferralPartnerFormState,
  type AdminReferralPartnerRecord,
  type ReferralPartnerStatusFilter,
} from "@/lib/settings/admin/referralPartnersApi";
import {
  fetchAdminReferralPartnerMetrics,
  type AdminPartnerMetrics,
} from "@/lib/settings/admin/referralProgramAdminApi";
import { formatMoney } from "@/lib/referrals/referralCopy";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const FILTERS: { id: ReferralPartnerStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

type SortKey = "name" | "signups" | "paying" | "commission";

const SORT_COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "signups", label: "Sign-ups", numeric: true },
  { key: "paying", label: "Paying", numeric: true },
  { key: "commission", label: "Commission", numeric: true },
];

function earnedTotalCents(metrics: AdminPartnerMetrics | undefined): number {
  return metrics?.earned.reduce((sum, amount) => sum + amount.cents, 0) ?? 0;
}

function sortValue(partner: AdminReferralPartnerRecord, metrics: AdminPartnerMetrics | undefined, key: SortKey) {
  switch (key) {
    case "name":
      return partner.name.toLowerCase();
    case "signups":
      return metrics?.signups ?? 0;
    case "paying":
      return metrics?.payingClients ?? 0;
    case "commission":
      return earnedTotalCents(metrics);
  }
}

function CommissionCell({ metrics }: { metrics: AdminPartnerMetrics | undefined }) {
  if (!metrics) return <span className="text-muted-foreground">—</span>;
  const earned = metrics.earned.filter((amount) => amount.cents !== 0);
  return (
    <div className="space-y-1">
      {earned.length ? (
        <p className="font-medium tabular-nums text-foreground">
          {earned.map((amount) => formatMoney(amount.cents, amount.currency)).join(" + ")}
        </p>
      ) : metrics.termsStatus === "confirmed" ? (
        <p className="tabular-nums text-foreground">{formatMoney(0, "usd")}</p>
      ) : null}
      {metrics.termsStatus === "not_configured" ? (
        <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-300">
          Terms not set
        </Badge>
      ) : null}
      {metrics.pendingTermsPayments > 0 ? (
        <p className="text-xs text-muted-foreground">
          {metrics.pendingTermsPayments} payment{metrics.pendingTermsPayments === 1 ? "" : "s"} awaiting terms
        </p>
      ) : null}
    </div>
  );
}

export default function AdminReferralPartnersTab() {
  const [partners, setPartners] = useState<AdminReferralPartnerRecord[]>([]);
  const [filter, setFilter] = useState<ReferralPartnerStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<AdminReferralPartnerRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [metrics, setMetrics] = useState<Map<string, AdminPartnerMetrics>>(new Map());
  const [metricsFailed, setMetricsFailed] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDesc, setSortDesc] = useState(false);

  const popupOpen = addOpen || editPartner !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditPartner(null);
  }, []);

  const reload = useCallback(async () => {
    const [result, metricRows] = await Promise.all([
      fetchAdminReferralPartners(filter),
      // Metrics need the NCLDD-56 migrations; the partner list must keep working without them.
      fetchAdminReferralPartnerMetrics().catch(() => null),
    ]);
    setPartners(result);
    setMetricsFailed(metricRows === null);
    setMetrics(new Map((metricRows ?? []).map((row) => [row.partnerId, row])));
  }, [filter]);

  const sortedPartners = useMemo(() => {
    const rows = [...partners];
    rows.sort((a, b) => {
      const av = sortValue(a, metrics.get(a.partnerId), sortKey);
      const bv = sortValue(b, metrics.get(b.partnerId), sortKey);
      const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv);
      return sortDesc ? -cmp : cmp;
    });
    return rows;
  }, [metrics, partners, sortDesc, sortKey]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDesc((value) => !value);
      } else {
        setSortKey(key);
        setSortDesc(key !== "name");
      }
    },
    [sortKey],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load referral partners.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleSave = useCallback(
    async (form: AdminReferralPartnerFormState) => {
      if (busy) return;
      setBusy(true);
      try {
        if (editPartner) {
          await updateAdminReferralPartner(editPartner.partnerId, form);
          toast.success("Partner updated.");
        } else {
          await createAdminReferralPartner(form);
          toast.success("Partner created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save partner.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editPartner, reload],
  );

  const handleToggleStatus = useCallback(
    async (partner: AdminReferralPartnerRecord) => {
      if (busy) return;
      setBusy(true);
      try {
        const next = partner.status === "active" ? "inactive" : "active";
        await setReferralPartnerStatus(partner.partnerId, next);
        await reload();
        toast.success(next === "active" ? "Partner activated." : "Partner deactivated.");
      } catch {
        toast.error("Couldn't update partner status.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload],
  );

  const handleCopyLink = useCallback(async (partner: AdminReferralPartnerRecord) => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/signup?ref=${encodeURIComponent(partner.referralCode)}`
          : partner.trackingUrl;
      await navigator.clipboard.writeText(url);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Couldn't copy link.");
    }
  }, []);

  const empty = useMemo(() => !loading && partners.length === 0, [loading, partners.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Referral Partners
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage B2B partners, codes, and tracking links. Organic user referrals stay under
            Analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/referral-partners/dashboard">Dashboard</Link>
          </Button>
          <Button onClick={() => setAddOpen(true)}>Add partner</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            className={cn(filter === item.id && bubbleStyle("Button_primary_"))}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {metricsFailed && !loading ? (
        <p className="text-xs text-muted-foreground">
          Partner metrics aren't available right now; the list below still works.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading partners…</p>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">No referral partners yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => toggleSort("name")}>
                    Name
                    {sortKey === "name" ? (sortDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />) : null}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {SORT_COLUMNS.map((column) => (
                  <th key={column.key} className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 uppercase"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      {sortKey === column.key ? (
                        sortDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      ) : null}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">Terms / account</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPartners.map((partner) => {
                const partnerMetrics = metrics.get(partner.partnerId);
                return (
                <tr key={partner.partnerId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/referral-partners/${partner.partnerId}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {partner.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{partner.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {partnerTypeLabel(partner.type)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{partner.referralCode}</td>
                  <td className="px-4 py-3">
                    <Badge variant={partner.status === "active" ? "secondary" : "outline"}>
                      {partner.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {partnerMetrics ? (
                      <>
                        {partnerMetrics.signups}
                        <span className="block text-xs text-muted-foreground">
                          {partnerMetrics.confirmed} confirmed
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{partnerMetrics?.payingClients ?? "—"}</td>
                  <td className="px-4 py-3">
                    <CommissionCell metrics={partnerMetrics} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {partnerMetrics?.terms
                      ? `${Number(partnerMetrics.terms.commissionPercent.toFixed(2))}% · ${
                          partnerMetrics.terms.scope === "months"
                            ? `${partnerMetrics.terms.scopeMonths} mo`
                            : partnerMetrics.terms.scope === "first_payment"
                              ? "first payment"
                              : "lifetime"
                        }`
                      : "No terms"}
                    <span className="block">
                      {partnerMetrics?.linkedEmail ? `Portal: ${partnerMetrics.linkedEmail}` : "No portal account"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Copy link"
                        onClick={() => void handleCopyLink(partner)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit"
                        onClick={() => setEditPartner(partner)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={partner.status === "active" ? "Deactivate" : "Activate"}
                        disabled={busy}
                        onClick={() => void handleToggleStatus(partner)}
                      >
                        {partner.status === "active" ? (
                          <UserMinus className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddReferralPartnerPopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editPartnerId={editPartner?.partnerId ?? null}
        initialForm={editPartner ? referralPartnerToForm(editPartner) : null}
      />
    </div>
  );
}
