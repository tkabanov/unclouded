import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  initNativeDeepLinkListener,
  registerDeepLinkNavigator,
} from "@/lib/platform/deepLinkRouting";

/**
 * MOB-12 — mounts once inside the router. Registers the navigator so any
 * deep link queued before this mounted (cold start from a universal/app-link
 * tap) is delivered immediately, then subscribes to further taps for as long
 * as the app is running.
 */
export default function DeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const unregister = registerDeepLinkNavigator((path) => navigate(path));
    const unsubscribe = initNativeDeepLinkListener();
    return () => {
      unregister();
      unsubscribe();
    };
  }, [navigate]);

  return null;
}
