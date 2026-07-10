import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { hasRecoveryHash } from "@/lib/auth/recoverySession";
import { PASSWORD_RECOVERY_PATH } from "@/lib/router/requireAuth";

/**
 * Supabase may redirect password recovery to Site URL root instead of /reset_pw
 * when the redirect URL is not whitelisted. Forward recovery tokens to the reset page.
 */
export default function RecoveryHashRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === PASSWORD_RECOVERY_PATH || !hasRecoveryHash()) {
      return;
    }
    navigate(`${PASSWORD_RECOVERY_PATH}${location.hash}`, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  return null;
}
