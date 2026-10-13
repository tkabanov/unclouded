import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchMyReferralOverview,
  type ReferralOverview,
} from "@/lib/referrals/referralOverviewApi";
import { ensureReferralCode } from "@/lib/share/referralCodeApi";

/**
 * "Invite a friend" data (NCLDD-56). The share code is created once on first visit
 * (`ensureReferralCode`) and is permanent afterwards.
 */
export function useReferralOverview() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (!user) {
      setOverview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // The list and credits don't depend on the code, so a failed code assignment doesn't
      // block the page.
      const code = await ensureReferralCode(user.id).catch(() => null);
      const next = await fetchMyReferralOverview();
      if (id === requestId.current) setOverview({ ...next, code: next.code ?? code });
    } catch (err) {
      if (id === requestId.current) {
        setError(err instanceof Error ? err.message : "Couldn't load your referrals.");
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { overview, loading, error, refresh: load };
}
