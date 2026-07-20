import { supabase } from "@/integrations/supabase/client";

export const WEB_PUSH_DISMISSED_KEY = "uncloud360_web_push_dismissed";

export type WebPushRegistrationResult = {
  status: "subscribed" | "skipped" | "denied" | "unsupported";
  reason?: string;
};

export type WebPushBannerState = "prompt" | "denied" | "unsupported" | "misconfigured";

function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function subscriptionPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid PushSubscription keys");
  }
  return {
    endpoint,
    keys: { p256dh, auth },
    platform: "web" as const,
    userAgent: navigator.userAgent,
  };
}

async function registerSubscription(
  subscription: PushSubscription,
): Promise<WebPushRegistrationResult> {
  const { error } = await supabase.functions.invoke("register-push-subscription", {
    body: subscriptionPayload(subscription),
  });

  if (error) {
    return { status: "skipped", reason: error.message };
  }

  return { status: "subscribed" };
}

export function isWebPushDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(WEB_PUSH_DISMISSED_KEY) === "1";
}

export function dismissWebPushOffer(): void {
  window.localStorage.setItem(WEB_PUSH_DISMISSED_KEY, "1");
}

export function getWebPushBannerState(): WebPushBannerState | null {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return null;
  }
  if (isWebPushDismissed()) return null;
  if (Notification.permission === "granted") return null;
  if (!isWebPushSupported()) return "unsupported";
  if (!getVapidPublicKey()) return "misconfigured";
  if (Notification.permission === "denied") return "denied";
  return "prompt";
}

/**
 * Sync an existing granted subscription to the backend. Safe to call on mount.
 */
export async function syncWebPushSubscriptionIfGranted(): Promise<WebPushRegistrationResult> {
  if (!isWebPushSupported()) {
    return { status: "unsupported" };
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    return { status: "skipped", reason: "VITE_VAPID_PUBLIC_KEY not set" };
  }

  if (Notification.permission !== "granted") {
    return { status: "skipped", reason: "notification permission not granted" };
  }

  try {
    const registration = await navigator.serviceWorker.register("/push-sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    return registerSubscription(subscription);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "skipped", reason: "push service not available" };
    }

    const message = error instanceof Error ? error.message : "web push sync failed";
    return { status: "skipped", reason: message };
  }
}

/**
 * Must run from a user gesture (button click). Browsers ignore permission prompts otherwise.
 */
export async function enableWebPushNotifications(): Promise<WebPushRegistrationResult> {
  if (!isWebPushSupported()) {
    return { status: "unsupported" };
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    return { status: "skipped", reason: "VITE_VAPID_PUBLIC_KEY not set" };
  }

  if (Notification.permission === "denied") {
    return { status: "denied" };
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { status: permission === "denied" ? "denied" : "skipped" };
    }
  }

  return syncWebPushSubscriptionIfGranted();
}

export { getVapidPublicKey };
