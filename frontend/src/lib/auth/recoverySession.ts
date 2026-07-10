import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  authorizeRecoveryUser,
  clearRecoveryAuthorization,
  isRecoveryAuthorizedForUser,
} from "@/lib/auth/recoverySessionState";

export function hasRecoveryHash(): boolean {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  return params.get("type") === "recovery" && Boolean(params.get("access_token"));
}

export function isPasswordRecoveryEvent(event: AuthChangeEvent): boolean {
  return event === "PASSWORD_RECOVERY";
}

export function isRecoveryAuthorized(session: Session | null | undefined): boolean {
  return isRecoveryAuthorizedForUser(session?.user.id);
}

export function subscribePasswordRecovery(): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (isPasswordRecoveryEvent(event) && session) {
      authorizeRecoveryUser(session.user.id);
      return;
    }
    if (event === "SIGNED_OUT") {
      clearRecoveryAuthorization();
    }
  });

  return () => subscription.unsubscribe();
}

export async function waitForRecoverySession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (isRecoveryAuthorized(session)) {
    return true;
  }

  if (!hasRecoveryHash()) {
    return false;
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
      resolve(ready);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (isPasswordRecoveryEvent(event) && nextSession) {
        authorizeRecoveryUser(nextSession.user.id);
        finish(true);
      }
    });

    const timeoutId = window.setTimeout(() => finish(false), 5000);

    void supabase.auth.getSession().then(({ data: { session: current } }) => {
      if (isRecoveryAuthorized(current)) {
        finish(true);
      }
    });
  });
}

export { clearRecoveryAuthorization } from "@/lib/auth/recoverySessionState";
