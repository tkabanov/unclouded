import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AdminUserDetailPanel from "@/components/settings/admin/AdminUserDetail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAdminUsersList,
  setAdminUserActive,
} from "@/lib/settings/admin/adminUsersApi";
import {
  adminUserTypeLabel,
  type AdminUserListItem,
  type AdminUserTypeSlug,
} from "@/lib/settings/admin/adminUserType";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatJoined(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AdminUserTypeSlug | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "deactivated" | "all">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const rows = await fetchAdminUsersList({ search, typeFilter, statusFilter });
    setUsers(rows);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleToggleActive = useCallback(
    async (user: AdminUserListItem) => {
      if (busyId) return;
      setBusyId(user.userId);
      try {
        await setAdminUserActive(user.userId, !user.isActive);
        toast.success(user.isActive ? "User deactivated." : "User reactivated.");
        await reload();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't update status.";
        toast.error(message);
      } finally {
        setBusyId(null);
      }
    },
    [busyId, reload],
  );

  if (selectedUserId) {
    return (
      <AdminUserDetailPanel
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
        onStatusChanged={() => void reload()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(bubbleStyle("Group_card_muted_"), "space-y-1 p-6")}>
        <h3 className={bubbleStyle("Text_heading_3_")}>User management</h3>
        <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
          View platform users, subscription type, and Active / Deactivated status. Open a row for
          full detail. Profile fields are read-only except status.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-users-search">
            Search
          </label>
          <Input
            id="admin-users-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-users-type">
            Type
          </label>
          <select
            id="admin-users-type"
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AdminUserTypeSlug | "all")}
          >
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-users-status">
            Status
          </label>
          <select
            id="admin-users-status"
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "active" | "deactivated" | "all")
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Date joined</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold"> </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.userId} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 font-medium"
                      onClick={() => setSelectedUserId(user.userId)}
                    >
                      {user.name}
                    </Button>
                    {user.email ? (
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{adminUserTypeLabel(user.type)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatJoined(user.dateJoined)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "outline" : "destructive"}>{user.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === user.userId}
                      onClick={() => void handleToggleActive(user)}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
