import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { fetchIsReferralPartner, fetchMyPartnerPortal, type PartnerPortal } from "@/lib/referrals/partnerPortalApi";

/** Partner portal data (NCLDD-56). `portal` stays null for accounts that are not partners. */
export function usePartnerPortal() {
  const { user } = useAuth();
  const [portal, setPortal] = useState<PartnerPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (!user) {
      setPortal(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchMyPartnerPortal();
      if (id === requestId.current) setPortal(next);
    } catch (err) {
      if (id === requestId.current) {
        setError(err instanceof Error ? err.message : "Couldn't load your partner portal.");
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { portal, loading, error, refresh: load };
}

// One check per signed-in user per page load; the sidebar re-mounts on every page.
const partnerCheckCache = new Map<string, Promise<boolean>>();

/** Whether the signed-in account is linked to a referral partner (sidebar link). */
export function useIsReferralPartner(): boolean {
  const { user } = useAuth();
  const [isPartner, setIsPartner] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsPartner(false);
      return;
    }
    let cancelled = false;
    let check = partnerCheckCache.get(user.id);
    if (!check) {
      check = fetchIsReferralPartner().catch(() => false);
      partnerCheckCache.set(user.id, check);
    }
    void check.then((value) => {
      if (!cancelled) setIsPartner(value);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return isPartner;
}
