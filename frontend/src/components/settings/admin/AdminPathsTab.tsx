import { useCallback, useEffect, useState } from "react";
import { List, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AddPathPopup from "@/components/settings/admin/AddPathPopup";
import PathSessionsEditor from "@/components/settings/admin/PathSessionsEditor";
import {
  createAdminPath,
  deleteAdminPath,
  fetchAdminPaths,
  getPathModeLabel,
  getPathTierLabel,
  getSensitivityLabel,
  setAdminPathActive,
  updateAdminPath,
  type AdminPathRecord,
} from "@/lib/settings/admin/adminPathsApi";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";

const TIER_SECTIONS: readonly TierSlug[] = [TIER.FREE, TIER.PRO, TIER.PREMIUM];

export default function AdminPathsTab() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<AdminPathRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPath, setEditPath] = useState<AdminPathRecord | null>(null);
  const [sessionsPath, setSessionsPath] = useState<AdminPathRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [tierFilter, setTierFilter] = useState<TierSlug | "all">("all");

  const popupOpen = addOpen || editPath !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditPath(null);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    const rows = await fetchAdminPaths(user.id);
    setPaths(rows);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load admin paths.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, user]);

  const handleSave = useCallback(
    async (form: Parameters<typeof createAdminPath>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        if (editPath) {
          await updateAdminPath(user.id, editPath.pathId, { ...form, slug: editPath.slug });
          toast.success("Path updated.");
        } else {
          await createAdminPath(user.id, form);
          toast.success("Path created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save path.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editPath, reload, user],
  );

  const handleDelete = useCallback(
    async (path: AdminPathRecord) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await deleteAdminPath(user.id, path.pathId);
        await reload();
        toast.success("Path deleted.");
      } catch {
        toast.error("Couldn't delete path.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  const handleToggleActive = useCallback(
    async (path: AdminPathRecord) => {
      if (busy) return;
      setBusy(true);
      try {
        await setAdminPathActive(path.pathId, !path.isActive);
        toast.success(path.isActive ? "Path unpublished." : "Path published.");
        await reload();
      } catch {
        toast.error("Couldn't update path status.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload],
  );

  const handleTierChange = useCallback(
    async (path: AdminPathRecord, nextTier: TierSlug) => {
      if (!user || busy || nextTier === path.tier) return;
      setBusy(true);
      try {
        await updateAdminPath(user.id, path.pathId, {
          slug: path.slug,
          name: path.name,
          description: path.description,
          tier: nextTier,
          coachingMode: path.coachingMode,
          subMode: path.subMode,
          sensitivity: path.sensitivity,
        });
        toast.success("Path tier updated.");
        await reload();
      } catch {
        toast.error("Couldn't update path tier.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading paths…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Paths
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage coaching path content and access tiers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="flex h-9 rounded-md border border-input bg-card px-3 text-sm"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as TierSlug | "all")}
            aria-label="Filter paths by tier"
          >
            <option value="all">All tiers</option>
            <option value={TIER.FREE}>Free</option>
            <option value={TIER.PRO}>Pro</option>
            <option value={TIER.PREMIUM}>Premium</option>
          </select>
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            onClick={() => setAddOpen(true)}
          >
            New path
          </Button>
        </div>
      </header>

      {TIER_SECTIONS.map((tier) => {
        if (tierFilter !== "all" && tierFilter !== tier) return null;
        const sectionPaths = paths.filter((p) => p.tier === tier);
        return (
          <div
            key={tier}
            className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold lowercase text-foreground">
                {getPathTierLabel(tier)} paths
              </h3>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {sectionPaths.length}
              </span>
            </div>
            {sectionPaths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paths in this tier.</p>
            ) : (
              <ul className="divide-y rounded-lg border border-border">
                {sectionPaths.map((path) => (
                  <li
                    key={path.pathId}
                    data-path-id={path.pathId}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{path.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {path.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getPathModeLabel(path.coachingMode)}
                        {path.subMode ? ` · ${path.subMode}` : ""}
                        {" · "}
                        {getSensitivityLabel(path.sensitivity)}
                        {" · "}
                        {path.sessionsCount} session(s)
                        {!path.isActive ? " · unpublished" : ""}
                      </p>
                    </div>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={path.tier}
                      disabled={busy}
                      aria-label={`Tier for ${path.name}`}
                      onChange={(e) => void handleTierChange(path, e.target.value as TierSlug)}
                    >
                      <option value={TIER.FREE}>free</option>
                      <option value={TIER.PRO}>pro</option>
                      <option value={TIER.PREMIUM}>premium</option>
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleToggleActive(path)}
                    >
                      {path.isActive ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setSessionsPath(path)}
                      title="Edit sessions"
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setEditPath({ ...path })}
                      title="Edit path"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleDelete(path)}
                      title="Delete path"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <AddPathPopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editPathId={editPath?.pathId ?? null}
        initialForm={
          editPath
            ? {
                slug: editPath.slug,
                name: editPath.name,
                description: editPath.description,
                tier: editPath.tier,
                coachingMode: editPath.coachingMode,
                subMode: editPath.subMode,
                sensitivity: editPath.sensitivity,
              }
            : null
        }
      />

      <PathSessionsEditor
        open={sessionsPath !== null}
        onOpenChange={(open) => {
          if (!open) setSessionsPath(null);
        }}
        path={sessionsPath}
        onSessionsChanged={() => void reload()}
      />
    </div>
  );
}
