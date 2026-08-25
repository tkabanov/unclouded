import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Pencil, UserCheck, UserMinus } from "lucide-react";
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
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const FILTERS: { id: ReferralPartnerStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export default function AdminReferralPartnersTab() {
  const [partners, setPartners] = useState<AdminReferralPartnerRecord[]>([]);
  const [filter, setFilter] = useState<ReferralPartnerStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<AdminReferralPartnerRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const popupOpen = addOpen || editPartner !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditPartner(null);
  }, []);

  const reload = useCallback(async () => {
    const result = await fetchAdminReferralPartners(filter);
    setPartners(result);
  }, [filter]);

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

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading partners…</p>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">No referral partners yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
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
              ))}
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
