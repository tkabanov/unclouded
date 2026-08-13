import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import { isPortalOnlyHrProfile } from "@/lib/userProfile/onboardingStatus";
import { listHrWorkplaces, type HrWorkplace } from "@/lib/employer/workplaceHrPortalApi";

export function useHrWorkplaces() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [workplaces, setWorkplaces] = useState<HrWorkplace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = profile?.email ?? user?.email ?? null;
    if (!email) {
      setWorkplaces([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void listHrWorkplaces(email, user?.id ?? null)
      .then((rows) => {
        if (!cancelled) setWorkplaces(rows);
      })
      .catch(() => {
        if (!cancelled) setWorkplaces([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.email, user?.email, user?.id]);

  const isHrContact = workplaces.length > 0;
  const isPortalOnlyHr = useMemo(
    () => isPortalOnlyHrProfile(profile, isHrContact),
    [profile, isHrContact],
  );

  return {
    workplaces,
    loading,
    isHrContact,
    isPortalOnlyHr,
  };
}
