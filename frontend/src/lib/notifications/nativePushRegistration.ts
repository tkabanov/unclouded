import { supabase } from "@/integrations/supabase/client";
import { getNativeAppVersion, getNativePlatform, isNativeApp } from "@/lib/platform/nativeApp";
import { routeDeepLink } from "@/lib/platform/deepLinkRouting";

/**
 * MOB-10: the FCM sender (`supabase/functions/_shared/nativePushDelivery.ts`)
 * sends every Android message on this channel id — keep the two in sync.
 */
export const ANDROID_PUSH_CHANNEL_ID = "uncloud360_default";

export type NativePushRegistrationResult =
  | { status: "registered" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "skipped"; reason: string };

export type NativePushBannerState = "prompt" | "denied" | "unsupported";

interface PushToken {
  value: string;
}

interface PushRegistrationError {
  error: string;
}

interface PushPermissionStatus {
  receive: "granted" | "denied" | "prompt" | "prompt-with-rationale";
}

interface PushNotificationSchema {
  data?: Record<string, unknown> | null;
}

interface PushActionPerformed {
  notification: PushNotificationSchema;
}

interface PushChannel {
  id: string;
  name: string;
  importance?: number;
}

interface PushNotificationsPlugin {
  checkPermissions: () => Promise<PushPermissionStatus>;
  requestPermissions: () => Promise<PushPermissionStatus>;
  register: () => Promise<void>;
  createChannel: (channel: PushChannel) => Promise<void>;
  addListener: {
    (eventName: "registration", callback: (token: PushToken) => void): Promise<{ remove: () => void }>;
    (
      eventName: "registrationError",
      callback: (error: PushRegistrationError) => void,
    ): Promise<{ remove: () => void }>;
    (
      eventName: "pushNotificationActionPerformed",
      callback: (action: PushActionPerformed) => void,
    ): Promise<{ remove: () => void }>;
  };
}

function getPushPlugin(): PushNotificationsPlugin | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as typeof window & {
    Capacitor?: { Plugins?: { PushNotifications?: PushNotificationsPlugin } };
  }).Capacitor;
  return bridge?.Plugins?.PushNotifications ?? null;
}

/** MOB-12 owns deep-link routing/resolution; this just forwards the tapped notification's `data.url`. */
function routeNotificationTapUrl(url: string): void {
  routeDeepLink(url);
}

async function postDeviceToken(deviceToken: string): Promise<void> {
  const platform = getNativePlatform();
  if (platform !== "ios" && platform !== "android") return;

  await supabase.functions.invoke("register-push-subscription", {
    body: {
      platform,
      deviceToken,
      appVersion: getNativeAppVersion() ?? undefined,
    },
  });
}

let listenersAttached = false;
let androidChannelEnsured = false;

/** Test-only reset of module state between cases. */
export function resetNativePushRegistrationForTests(): void {
  listenersAttached = false;
  androidChannelEnsured = false;
}

/** Idempotent on the native side; best-effort — a failure here shouldn't block registration. */
async function ensureAndroidChannel(push: PushNotificationsPlugin): Promise<void> {
  if (androidChannelEnsured || getNativePlatform() !== "android") return;
  androidChannelEnsured = true;
  try {
    await push.createChannel({
      id: ANDROID_PUSH_CHANNEL_ID,
      name: "Unclouded",
      importance: 4,
    });
  } catch {
    // Best-effort; Android falls back to its default channel if this fails.
  }
}

function attachListenersOnce(push: PushNotificationsPlugin): void {
  if (listenersAttached) return;
  listenersAttached = true;

  Promise.resolve(
    push.addListener("registration", (token) => {
      void postDeviceToken(token.value);
    }),
  ).catch(() => {});

  Promise.resolve(
    push.addListener("registrationError", () => {
      // No UI to report to from an async registration failure; the initial
      // requestPermissions()/register() call already surfaces a result.
    }),
  ).catch(() => {});

  Promise.resolve(
    push.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url;
      if (typeof url === "string") routeNotificationTapUrl(url);
    }),
  ).catch(() => {});
}

/** Current permission state without prompting. Safe to call on mount. */
export async function getNativePushBannerState(): Promise<NativePushBannerState | null> {
  if (!isNativeApp()) return null;

  const push = getPushPlugin();
  if (!push) return "unsupported";

  try {
    const status = await push.checkPermissions();
    if (status.receive === "granted") return null;
    if (status.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

/**
 * Registers for native push without prompting: safe to call on every native
 * launch/sign-in when permission was already granted (re-registers the
 * device token the same way `syncWebPushSubscriptionIfGranted` does for web).
 */
export async function syncNativePushIfGranted(): Promise<NativePushRegistrationResult> {
  if (!isNativeApp()) return { status: "unsupported" };

  const push = getPushPlugin();
  if (!push) return { status: "unsupported" };

  try {
    const status = await push.checkPermissions();
    if (status.receive !== "granted") {
      return { status: "skipped", reason: "notification permission not granted" };
    }

    attachListenersOnce(push);
    await ensureAndroidChannel(push);
    await push.register();
    return { status: "registered" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "native push sync failed";
    return { status: "skipped", reason: message };
  }
}

/** Must run from a user gesture (button tap) — the OS permission prompt requires one. */
export async function enableNativePushNotifications(): Promise<NativePushRegistrationResult> {
  if (!isNativeApp()) return { status: "unsupported" };

  const push = getPushPlugin();
  if (!push) return { status: "unsupported" };

  try {
    const status = await push.requestPermissions();
    if (status.receive !== "granted") {
      return { status: "denied" };
    }

    attachListenersOnce(push);
    await ensureAndroidChannel(push);
    await push.register();
    return { status: "registered" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "native push registration failed";
    return { status: "skipped", reason: message };
  }
}
