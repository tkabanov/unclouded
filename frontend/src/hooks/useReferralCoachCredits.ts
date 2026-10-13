import { useCallback, useEffect, useState } from "react";

import { fetchMyReferralCoachCredits } from "@/lib/referrals/referralCoachCreditsApi";

/** Referral coach credit balance for the booking UI (NCLDD-56). */
export function useReferralCoachCredits() {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setCredits(await fetchMyReferralCoachCredits());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { credits, loading, refresh };
}
