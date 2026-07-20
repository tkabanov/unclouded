/** REQ-07 delivery orchestration — prefer Web Push when subscribed, else email. */

import {
  buildVulnerableOutreachPushPayload,
  VULNERABLE_OUTREACH_MESSAGE,
} from "./vulnerableOutreachLogic.ts";
import { isWebPushConfigured } from "./webPushEnv.ts";
import type {
  PushSubscriptionRow,
  WebPushPayload,
  WebPushSendResult,
} from "./webPushDelivery.ts";

export type EmailSendResult = { ok: boolean; detail: string };

export type VulnerableOutreachDeliveryResult = {
  channel: "web-push" | "email" | "none";
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
  subscriptions: PushSubscriptionRow[];
  appUrl: string;
  sendPush: (
    subscription: PushSubscriptionRow,
    payload: WebPushPayload,
  ) => Promise<WebPushSendResult>;
  sendEmail: (params: {
    to: string;
    firstName: string | null;
  }) => Promise<EmailSendResult>;
}): Promise<VulnerableOutreachDeliveryResult> {
  const expiredSubscriptionIds: string[] = [];
  const pushPayload = buildOutreachPushPayload(params.appUrl);
  const pushReady = isWebPushConfigured() && params.subscriptions.length > 0;

  if (pushReady) {
    for (const subscription of params.subscriptions) {
      const pushResult = await params.sendPush(subscription, pushPayload);
      if (pushResult.ok) {
        return {
          channel: "web-push",
          ok: true,
          detail: pushResult.detail,
          expiredSubscriptionIds,
        };
      }
      if (pushResult.expired) {
        expiredSubscriptionIds.push(subscription.id);
      }
    }
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
      expiredSubscriptionIds,
    };
  }

  if (pushReady) {
    return {
      channel: "none",
      ok: false,
      detail: "push:failed — all subscriptions expired or rejected; smtp:skipped — no email on profile",
      expiredSubscriptionIds,
    };
  }

  if (isWebPushConfigured()) {
    return {
      channel: "none",
      ok: false,
      detail: `push:skipped — no subscription; smtp:skipped — no email on profile`,
      expiredSubscriptionIds,
    };
  }

  return {
    channel: "none",
    ok: false,
    detail: `push:skipped — VAPID not configured; smtp:skipped — no email on profile`,
    expiredSubscriptionIds,
  };
}

export { VULNERABLE_OUTREACH_MESSAGE };
