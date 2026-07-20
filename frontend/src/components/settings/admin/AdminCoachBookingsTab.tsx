import { Fragment, useEffect, useState } from "react";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ADMIN_COACH_BOOKINGS_EMPTY,
  ADMIN_COACH_BOOKINGS_NOTICE,
  formatCoachBookingDeliveryStatus,
  listCoachBookingsForAdmin,
  type AdminCoachBookingRow,
} from "@/lib/settings/admin/adminCoachBookingsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function BriefPanel({ row }: { row: AdminCoachBookingRow }) {
  const brief = row.kotaRead?.trim();
  if (!brief) {
    return (
      <p className="text-sm text-muted-foreground">
        Kota&apos;s Read is still generating for this booking.
      </p>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(brief);
      toast.success("Brief copied to clipboard.");
    } catch {
      toast.error("Could not copy brief.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
          <Copy className="mr-2 h-4 w-4" aria-hidden />
          Copy brief
        </Button>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5" aria-hidden />
          {formatCoachBookingDeliveryStatus(row)}
          {row.kotaReadEmailedAt ? ` · ${formatWhen(row.kotaReadEmailedAt)}` : null}
        </span>
      </div>
      {row.kotaReadEmailDetail?.trim() ? (
        <p className="text-xs text-muted-foreground">{row.kotaReadEmailDetail}</p>
      ) : null}
      <pre
        className={cn(
          bubbleStyle("Group_card_muted_"),
          "max-h-96 overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed",
        )}
      >
        {brief}
      </pre>
    </div>
  );
}

/** Block 3.35 — Kota's Read delivery queue for PuP coaches / admins. */
export default function AdminCoachBookingsTab() {
  const [rows, setRows] = useState<AdminCoachBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCoachBookingsForAdmin()
      .then((bookings) => {
        if (!cancelled) {
          setRows(bookings);
          if (bookings.length > 0) setExpandedId(bookings[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load coach briefs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading coach briefs…</p>;
  }

  const readyCount = rows.filter((row) => row.kotaRead?.trim()).length;
  const emailedCount = rows.filter((row) => row.kotaReadEmailedAt).length;

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-2 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>Coach briefs — Kota&apos;s Read (Block 3.35)</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>{ADMIN_COACH_BOOKINGS_NOTICE}</p>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-2xl font-bold tabular-nums">{rows.length}</p>
            <p className="text-xs text-muted-foreground">Bookings</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{readyCount}</p>
            <p className="text-xs text-muted-foreground">Briefs ready</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{emailedCount}</p>
            <p className="text-xs text-muted-foreground">Emailed to coach inbox</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_COACH_BOOKINGS_EMPTY}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Booked</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Delivery</th>
                <th className="px-4 py-3 font-medium">Brief</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="border-b border-border/60">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-foreground">
                          {row.memberFirstName || "Member"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.memberEmail || row.userId}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatWhen(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top capitalize">{row.status || "pending"}</td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatCoachBookingDeliveryStatus(row)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(expanded ? null : row.id)}
                        >
                          {expanded ? "Hide" : row.kotaRead?.trim() ? "View" : "Waiting"}
                        </Button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-border/60 bg-muted/20">
                        <td colSpan={5} className="px-4 py-4">
                          <BriefPanel row={row} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
