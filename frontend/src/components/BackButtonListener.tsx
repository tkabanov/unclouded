import { useEffect } from "react";

import { initNativeBackButtonListener } from "@/lib/platform/deepLinkRouting";

/**
 * MOB-UI-002 — mounts once inside the router. Subscribes to the native
 * hardware/gesture back button so it unwinds SPA history before Capacitor's
 * default minimize/exit behavior takes over.
 */
export default function BackButtonListener() {
  useEffect(() => {
    const unsubscribe = initNativeBackButtonListener();
    return unsubscribe;
  }, []);

  return null;
}
