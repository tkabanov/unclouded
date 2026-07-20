import { useEffect } from "react";

import { syncWebPushSubscriptionIfGranted } from "@/lib/notifications/webPushRegistration";

/** Keeps backend subscription in sync when the user already granted notifications. */
export default function WebPushRegistrationEffect() {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }

    void syncWebPushSubscriptionIfGranted();
  }, []);

  return null;
}
