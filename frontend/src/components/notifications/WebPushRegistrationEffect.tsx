import { useEffect } from "react";

import { isNativeApp } from "@/lib/platform/nativeApp";
import { syncNativePushIfGranted } from "@/lib/notifications/nativePushRegistration";
import { syncWebPushSubscriptionIfGranted } from "@/lib/notifications/webPushRegistration";

/** Keeps backend subscription in sync when the user already granted notifications. */
export default function WebPushRegistrationEffect() {
  useEffect(() => {
    if (isNativeApp()) {
      void syncNativePushIfGranted();
      return;
    }

    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }

    void syncWebPushSubscriptionIfGranted();
  }, []);

  return null;
}
