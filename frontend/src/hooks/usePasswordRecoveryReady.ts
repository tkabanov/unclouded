import { useEffect, useState } from "react";
import {
  hasRecoveryHash,
  isPasswordRecoveryEvent,
  isRecoveryAuthorized,
  subscribePasswordRecovery,
  waitForRecoverySession,
} from "@/lib/auth/recoverySession";
import { supabase } from "@/integrations/supabase/client";

type RecoveryReadyState = "loading" | "ready" | "invalid";

export function usePasswordRecoveryReady(): RecoveryReadyState {
  const [state, setState] = useState<RecoveryReadyState>("loading");

  useEffect(() => {
    let cancelled = false;

    const resolve = (next: RecoveryReadyState) => {
      if (!cancelled) setState(next);
    };

    const unsubscribeRecovery = subscribePasswordRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isPasswordRecoveryEvent(event) && session) {
        resolve("ready");
      }
    });

    const evaluate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (isRecoveryAuthorized(session)) {
        resolve("ready");
        return;
      }

      if (hasRecoveryHash()) {
        const ready = await waitForRecoverySession();
        if (cancelled) return;
        resolve(ready ? "ready" : "invalid");
        return;
      }

      resolve("invalid");
    };

    void evaluate();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      unsubscribeRecovery();
    };
  }, []);

  return state;
}
