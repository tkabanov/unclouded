/** REQ-07 delivery orchestration — prefer push (web or native, MOB-10) when subscribed, else email. */

import {
  buildVulnerableOutreachPushPayload,
  VULNERABLE_OUTREACH_MESSAGE,
} from "./vulnerableOutreachLogic.ts";
import { isWebPushConfigured } from "./webPushEnv.ts";
import { fanOutPushToSubscriptions, type AnyPushSubscriptionRow, type PushFanoutDeps } from "./pushFanout.ts";
import type { WebPushPayload } from "./webPushDelivery.ts";

export type EmailSendResult = { ok: boolean; detail: string };

export type VulnerableOutreachDeliveryResult = {
  channel: "web-push" | "native-push" | "email" | "none";
  ok: boolean;
  detail: string;
  expiredSubscriptionIds: string[];
};

export function buildOutreachPushPayload(appUrl: string): WebPushPayload {
  return buildVulnerableOutreachPushPayload(appUrl);
}

export async function deliverVulnerableOutreach(params: {
  email: string | null;
  firstName: string | null;
  subscriptions: AnyPushSubscriptionRow[];
  appUrl: string;
  sendPush: PushFanoutDeps["sendWebPush"];
  sendNativePush: PushFanoutDeps["sendNativePush"];
  sendEmail: (params: {
    to: string;
    firstName: string | null;
  }) => Promise<EmailSendResult>;
}): Promise<VulnerableOutreachDeliveryResult> {
  const pushPayload = buildOutreachPushPayload(params.appUrl);
  const pushReady = isWebPushConfigured() && params.subscriptions.length > 0;

  const fanout = await fanOutPushToSubscriptions(params.subscriptions, pushPayload, {
    sendWebPush: params.sendPush,
    sendNativePush: params.sendNativePush,
  });

  if (fanout.ok) {
    const succeeded = fanout.results.find((r) => r.ok);
    return {
      channel: succeeded?.channel ?? "web-push",
      ok: true,
      detail: succeeded?.detail ?? "push:sent",
      expiredSubscriptionIds: fanout.invalidSubscriptionIds,
    };
  }

  if (params.email) {
    const emailResult = await params.sendEmail({
      to: params.email,
      firstName: params.firstName,
    });
    return {
      channel: "email",
      ok: emailResult.ok,
      detail: emailResult.detail,
      expiredSubscriptionIds: fanout.invalidSubscriptionIds,
    };
  }

  if (pushReady) {
    return {
      channel: "none",
      ok: false,
      detail: "push:failed — all subscriptions expired or rejected; smtp:skipped — no email on profile",
      expiredSubscriptionIds: fanout.invalidSubscriptionIds,
    };
  }

  if (isWebPushConfigured()) {
    return {
      channel: "none",
      ok: false,
      detail: `push:skipped — no subscription; smtp:skipped — no email on profile`,
      expiredSubscriptionIds: fanout.invalidSubscriptionIds,
    };
  }

  return {
    channel: "none",
    ok: false,
    detail: `push:skipped — VAPID not configured; smtp:skipped — no email on profile`,
    expiredSubscriptionIds: fanout.invalidSubscriptionIds,
  };
}

export { VULNERABLE_OUTREACH_MESSAGE };
