import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  loadSubscriptionOverview,
  subscriptionRecordOf,
} from "@/lib/subscription/subscriptionApi";
import {
  type SubscriptionOverview,
  type SubscriptionRecord,
} from "@/lib/subscription/subscriptionState";

export type UseSubscriptionOverview = {
  overview: SubscriptionOverview | null;
  record: SubscriptionRecord | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Apply a fresh overview returned by an action without a second round trip. */
  applyOverview: (next: SubscriptionOverview | null) => void;
};

export function useSubscriptionOverview(): UseSubscriptionOverview {
  const { user } = useAuth();
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOverview(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setOverview(await loadSubscriptionOverview());
      setError(null);
    } catch (err) {
      console.error("Failed to load subscription overview", err);
      setError(err instanceof Error ? err.message : "Couldn't load your subscription details.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyOverview = useCallback((next: SubscriptionOverview | null) => {
    if (next) setOverview(next);
  }, []);

  const record = useMemo(
    () => (overview ? subscriptionRecordOf(overview) : null),
    [overview],
  );

  return { overview, record, loading, error, refresh: load, applyOverview };
}
