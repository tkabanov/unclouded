/** Web Push delivery helpers (VAPID). Used by cron outreach and future notification edges. */

import webpush from "npm:web-push@3";

import { getWebPushConfig } from "./webPushEnv.ts";

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type WebPushPayload = {
  title: string;
  body: string;
  url: string;
};

export type WebPushSendResult = {
  ok: boolean;
  detail: string;
  expired?: boolean;
};

export { isWebPushConfigured } from "./webPushEnv.ts";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const config = getWebPushConfig();
  if (!config) return false;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendWebPushToSubscription(
  row: PushSubscriptionRow,
  payload: WebPushPayload,
): Promise<WebPushSendResult> {
  if (!ensureVapidConfigured()) {
    return { ok: false, detail: "push:skipped — VAPID env not set" };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      },
      JSON.stringify(payload),
    );
    return { ok: true, detail: "push:sent" };
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : null;

    if (statusCode === 404 || statusCode === 410) {
      return {
        ok: false,
        detail: `push:expired — ${statusCode}`,
        expired: true,
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: `push:error — ${message}` };
  }
}
