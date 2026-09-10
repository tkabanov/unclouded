/**
 * Platform-aware push fan-out: loads a user's subscriptions once (already
 * queried by the caller) and dispatches each row to the sender for its
 * platform — web rows to `sendWebPushToSubscription`, iOS/Android rows to
 * `sendNativePushToSubscription`. Callers inject the senders (same
 * dependency-injection pattern as `vulnerableOutreachDelivery.ts`) so this
 * module has no `npm:`/Deno-only imports and can be unit-tested directly.
 */
import type { WebPushPayload, WebPushSendResult } from "./webPushDelivery.ts";
import type { NativePushSendResult } from "./nativePushDelivery.ts";

/** One row from `pushDeviceSubscription`, any platform. */
export type AnyPushSubscriptionRow = {
  id: string;
  platform: string;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  deviceToken: string | null;
};

export type PushFanoutChannel = "web-push" | "native-push";

export type PushFanoutSendResult = {
  id: string;
  channel: PushFanoutChannel;
  ok: boolean;
  detail: string;
};

export type PushFanoutResult = {
  /** True if at least one subscription (any platform) received the push. */
  ok: boolean;
  sentCount: number;
  results: PushFanoutSendResult[];
  /** Rows whose token/endpoint is permanently dead — caller should delete them. */
  invalidSubscriptionIds: string[];
};

export type PushFanoutDeps = {
  sendWebPush: (
    row: { id: string; endpoint: string; p256dh: string; auth: string },
    payload: WebPushPayload,
  ) => Promise<WebPushSendResult>;
  sendNativePush: (
    row: { id: string; deviceToken: string; platform: "ios" | "android" },
    payload: WebPushPayload,
  ) => Promise<NativePushSendResult>;
};

export async function fanOutPushToSubscriptions(
  subscriptions: AnyPushSubscriptionRow[],
  payload: WebPushPayload,
  deps: PushFanoutDeps,
): Promise<PushFanoutResult> {
  const results: PushFanoutSendResult[] = [];
  const invalidSubscriptionIds: string[] = [];
  let sentCount = 0;

  for (const row of subscriptions) {
    if (row.platform === "ios" || row.platform === "android") {
      if (!row.deviceToken) continue;

      const result = await deps.sendNativePush(
        { id: row.id, deviceToken: row.deviceToken, platform: row.platform },
        payload,
      );
      results.push({ id: row.id, channel: "native-push", ok: result.ok, detail: result.detail });
      if (result.ok) sentCount += 1;
      if (result.invalidToken) invalidSubscriptionIds.push(row.id);
      continue;
    }

    if (!row.endpoint || !row.p256dh || !row.auth) continue;

    const result = await deps.sendWebPush(
      { id: row.id, endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
      payload,
    );
    results.push({ id: row.id, channel: "web-push", ok: result.ok, detail: result.detail });
    if (result.ok) sentCount += 1;
    if (result.expired) invalidSubscriptionIds.push(row.id);
  }

  return { ok: sentCount > 0, sentCount, results, invalidSubscriptionIds };
}
